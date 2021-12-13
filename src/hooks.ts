/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useCallback, useContext, useEffect, useState, useRef } from 'react';

import { UserAttributes, OptimizelyDecideOption } from '@optimizely/optimizely-sdk';
import { getLogger, LoggerFacade } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { ReactSDKClient, VariableValuesObject, OnReadyResult } from './client';
import clientNotifier from './notifier';
import { OptimizelyContext } from './Context';
import { areAttributesEqual, OptimizelyDecision, createFailedDecision } from './utils';

const hooksLogger: LoggerFacade = getLogger('ReactSDK');

enum HookType {
  EXPERIMENT = 'Experiment',
  FEATURE = 'Feature',
}

type HookOptions = {
  autoUpdate?: boolean;
  timeout?: number;
};

type DecideHooksOptions = HookOptions & { decideOptions?: OptimizelyDecideOption[] };

type HookOverrides = {
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
};

type ClientReady = boolean;

type DidTimeout = boolean;

interface InitializationState {
  clientReady: ClientReady;
  didTimeout: DidTimeout;
}

// TODO - Get these from the core SDK once it's typed
interface ExperimentDecisionValues {
  variation: string | null;
}

// TODO - Get these from the core SDK once it's typed
interface FeatureDecisionValues {
  isEnabled: boolean;
  variables: VariableValuesObject;
}

interface UseExperiment {
  (experimentKey: string, options?: HookOptions, overrides?: HookOverrides): [
    ExperimentDecisionValues['variation'],
    ClientReady,
    DidTimeout
  ];
}

interface UseFeature {
  (featureKey: string, options?: HookOptions, overrides?: HookOverrides): [
    FeatureDecisionValues['isEnabled'],
    FeatureDecisionValues['variables'],
    ClientReady,
    DidTimeout
  ];
}

interface UseDecision {
  (featureKey: string, options?: DecideHooksOptions, overrides?: HookOverrides): [
    OptimizelyDecision,
    ClientReady,
    DidTimeout
  ];
}

interface DecisionInputs {
  entityKey: string;
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
}

/**
 * Equality check applied to decision inputs passed into hooks (experiment/feature keys, override user IDs, and override user attributes).
 * Used to determine when we need to recompute a decision because different inputs were passed into a hook.
 * @param {DecisionInputs} oldDecisionInputs
 * @param {DecisionInput} newDecisionInputs
 * @returns boolean
 */
function areDecisionInputsEqual(oldDecisionInputs: DecisionInputs, newDecisionInputs: DecisionInputs): boolean {
  return (
    oldDecisionInputs.entityKey === newDecisionInputs.entityKey &&
    oldDecisionInputs.overrideUserId === newDecisionInputs.overrideUserId &&
    areAttributesEqual(oldDecisionInputs.overrideAttributes, newDecisionInputs.overrideAttributes)
  );
}

/**
 * Subscribe to changes in initialization state of the argument client. onInitStateChange callback
 * is called on the following events:
 * - optimizely successfully becomes ready
 * - timeout is reached prior to optimizely becoming ready
 * - optimizely becomes ready after the timeout has already passed
 * @param {ReactSDKClient} optimizely
 * @param {number|undefined} timeout
 * @param {Function} onInitStateChange
 */
function subscribeToInitialization(
  optimizely: ReactSDKClient,
  timeout: number | undefined,
  onInitStateChange: (initState: InitializationState) => void
): void {
  optimizely
    .onReady({ timeout })
    .then((res: OnReadyResult) => {
      if (res.success) {
        hooksLogger.info('Client became ready');
        onInitStateChange({
          clientReady: true,
          didTimeout: false,
        });
        return;
      }
      hooksLogger.info(`Client did not become ready before timeout of ${timeout}ms, reason="${res.reason || ''}"`);
      onInitStateChange({
        clientReady: false,
        didTimeout: true,
      });
      res.dataReadyPromise!.then(() => {
        hooksLogger.info('Client became ready after timeout already elapsed');
        onInitStateChange({
          clientReady: true,
          didTimeout: true,
        });
      });
    })
    .catch(() => {
      hooksLogger.error(`Error initializing client. The core client or user promise(s) rejected.`);
    });
}

function useCompareAttrsMemoize(value: UserAttributes | undefined): UserAttributes | undefined {
  const ref = useRef<UserAttributes | undefined>();
  if (!areAttributesEqual(value, ref.current)) {
    ref.current = value;
  }
  return ref.current;
}

/**
 * A React Hook that retrieves the variation for an experiment, optionally
 * auto updating that value based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useExperiment: UseExperiment = (experimentKey, options = {}, overrides = {}) => {
  const { optimizely, isServerSide, timeout } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  const overrideAttrs = useCompareAttrsMemoize(overrides.overrideAttributes);
  const getCurrentDecision: () => ExperimentDecisionValues = useCallback(
    () => ({
      variation: optimizely.activate(experimentKey, overrides.overrideUserId, overrideAttrs),
    }),
    [optimizely, experimentKey, overrides.overrideUserId, overrideAttrs]
  );

  const isClientReady = isServerSide || optimizely.isReady();
  const [state, setState] = useState<ExperimentDecisionValues & InitializationState>(() => {
    const decisionState = isClientReady ? getCurrentDecision() : { variation: null };
    return {
      ...decisionState,
      clientReady: isClientReady,
      didTimeout: false,
    };
  });
  // Decision state is derived from entityKey and overrides arguments.
  // Track the previous value of those arguments, and update state when they change.
  // This is an instance of the derived state pattern recommended here:
  // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
  const currentDecisionInputs: DecisionInputs = {
    entityKey: experimentKey,
    overrideUserId: overrides.overrideUserId,
    overrideAttributes: overrideAttrs,
  };
  const [prevDecisionInputs, setPrevDecisionInputs] = useState<DecisionInputs>(currentDecisionInputs);
  if (!areDecisionInputsEqual(prevDecisionInputs, currentDecisionInputs)) {
    setPrevDecisionInputs(currentDecisionInputs);
    setState(prevState => ({
      ...prevState,
      ...getCurrentDecision(),
    }));
  }

  const finalReadyTimeout = options.timeout !== undefined ? options.timeout : timeout;
  useEffect(() => {
    // Subscribe to initialzation promise only
    // 1. When client is using Sdk Key, which means the initialization will be asynchronous
    //    and we need to wait for the promise and update decision.
    // 2. When client is using datafile only but client is not ready yet which means user
    //    was provided as a promise and we need to subscribe and wait for user to become available.
    if (optimizely.getIsUsingSdkKey() || !isClientReady) {
      subscribeToInitialization(optimizely, finalReadyTimeout, initState => {
        setState({
          ...getCurrentDecision(),
          ...initState,
        });
      });
    }
  }, []);

  useEffect(() => {
    // Subscribe to update after first datafile is fetched and readyPromise is resolved to avoid redundant rendering.
    if (optimizely.getIsReadyPromiseFulfilled() && options.autoUpdate) {
      return setupAutoUpdateListeners(optimizely, HookType.EXPERIMENT, experimentKey, hooksLogger, () => {
        setState(prevState => ({
          ...prevState,
          ...getCurrentDecision(),
        }));
      });
    }
    return (): void => {};
  }, [optimizely.getIsReadyPromiseFulfilled(), options.autoUpdate, optimizely, experimentKey, getCurrentDecision]);

  useEffect(
    () =>
      optimizely.onForcedVariationsUpdate(() => {
        setState(prevState => ({
          ...prevState,
          ...getCurrentDecision(),
        }));
      }),
    [getCurrentDecision, optimizely]
  );

  return [state.variation, state.clientReady, state.didTimeout];
};

/**
 * A React Hook that retrieves the status of a feature flag and its variables, optionally
 * auto updating those values based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useFeature: UseFeature = (featureKey, options = {}, overrides = {}) => {
  const { optimizely, isServerSide, timeout } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  const overrideAttrs = useCompareAttrsMemoize(overrides.overrideAttributes);
  const getCurrentDecision: () => FeatureDecisionValues = useCallback(
    () => ({
      isEnabled: optimizely.isFeatureEnabled(featureKey, overrides.overrideUserId, overrideAttrs),
      variables: optimizely.getFeatureVariables(featureKey, overrides.overrideUserId, overrideAttrs),
    }),
    [optimizely, featureKey, overrides.overrideUserId, overrideAttrs]
  );

  const isClientReady = isServerSide || optimizely.isReady();
  const [state, setState] = useState<FeatureDecisionValues & InitializationState>(() => {
    const decisionState = isClientReady ? getCurrentDecision() : { isEnabled: false, variables: {} };
    return {
      ...decisionState,
      clientReady: isClientReady,
      didTimeout: false,
    };
  });
  // Decision state is derived from entityKey and overrides arguments.
  // Track the previous value of those arguments, and update state when they change.
  // This is an instance of the derived state pattern recommended here:
  // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
  const currentDecisionInputs: DecisionInputs = {
    entityKey: featureKey,
    overrideUserId: overrides.overrideUserId,
    overrideAttributes: overrides.overrideAttributes,
  };
  const [prevDecisionInputs, setPrevDecisionInputs] = useState<DecisionInputs>(currentDecisionInputs);
  if (!areDecisionInputsEqual(prevDecisionInputs, currentDecisionInputs)) {
    setPrevDecisionInputs(currentDecisionInputs);
    setState(prevState => ({
      ...prevState,
      ...getCurrentDecision(),
    }));
  }

  const finalReadyTimeout = options.timeout !== undefined ? options.timeout : timeout;
  useEffect(() => {
    // Subscribe to initialzation promise only
    // 1. When client is using Sdk Key, which means the initialization will be asynchronous
    //    and we need to wait for the promise and update decision.
    // 2. When client is using datafile only but client is not ready yet which means user
    //    was provided as a promise and we need to subscribe and wait for user to become available.
    if (optimizely.getIsUsingSdkKey() || !isClientReady) {
      subscribeToInitialization(optimizely, finalReadyTimeout, initState => {
        setState({
          ...getCurrentDecision(),
          ...initState,
        });
      });
    }
  }, []);

  useEffect(() => {
    // Subscribe to update after first datafile is fetched and readyPromise is resolved to avoid redundant rendering.
    if (optimizely.getIsReadyPromiseFulfilled() && options.autoUpdate) {
      return setupAutoUpdateListeners(optimizely, HookType.FEATURE, featureKey, hooksLogger, () => {
        setState(prevState => ({
          ...prevState,
          ...getCurrentDecision(),
        }));
      });
    }
    return (): void => {};
  }, [optimizely.getIsReadyPromiseFulfilled(), options.autoUpdate, optimizely, featureKey, getCurrentDecision]);

  return [state.isEnabled, state.variables, state.clientReady, state.didTimeout];
};

/**
 * A React Hook that retrieves the flag decision, optionally
 * auto updating those values based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useDecision: UseDecision = (flagKey, options = {}, overrides = {}) => {
  const [lastUserUpdate, setLastUserUpdate] = useState<Date | null>(null);
  const notifier = clientNotifier.getInstance();
  const { optimizely, isServerSide, timeout } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  const overrideAttrs = useCompareAttrsMemoize(overrides.overrideAttributes);
  const getCurrentDecision: () => { decision: OptimizelyDecision } = () => ({
    decision: optimizely.decide(flagKey, options.decideOptions, overrides.overrideUserId, overrideAttrs),
  });

  const isClientReady = isServerSide || optimizely.isReady();
  const [state, setState] = useState<{ decision: OptimizelyDecision } & InitializationState>(() => {
    const decisionState = isClientReady
      ? getCurrentDecision()
      : {
          decision: createFailedDecision(flagKey, 'Optimizely SDK not configured properly yet.', {
            id: overrides.overrideUserId || null,
            attributes: overrideAttrs,
          }),
        };
    return {
      ...decisionState,
      clientReady: isClientReady,
      didTimeout: false,
    };
  });
  // Decision state is derived from entityKey and overrides arguments.
  // Track the previous value of those arguments, and update state when they change.
  // This is an instance of the derived state pattern recommended here:
  // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
  const currentDecisionInputs: DecisionInputs = {
    entityKey: flagKey,
    overrideUserId: overrides.overrideUserId,
    overrideAttributes: overrides.overrideAttributes,
  };
  const [prevDecisionInputs, setPrevDecisionInputs] = useState<DecisionInputs>(currentDecisionInputs);
  if (!areDecisionInputsEqual(prevDecisionInputs, currentDecisionInputs)) {
    setPrevDecisionInputs(currentDecisionInputs);
    setState(prevState => ({
      ...prevState,
      ...getCurrentDecision(),
    }));
  }

  const finalReadyTimeout = options.timeout !== undefined ? options.timeout : timeout;
  useEffect(() => {
    // Subscribe to initialzation promise only
    // 1. When client is using Sdk Key, which means the initialization will be asynchronous
    //    and we need to wait for the promise and update decision.
    // 2. When client is using datafile only but client is not ready yet which means user
    //    was provided as a promise and we need to subscribe and wait for user to become available.
    if (optimizely.getIsUsingSdkKey() || !isClientReady) {
      subscribeToInitialization(optimizely, finalReadyTimeout, initState => {
        setState({
          ...getCurrentDecision(),
          ...initState,
        });
      });
    }
  }, []);

  useEffect(() => {
    // Subscribe to the observable store to listen to changes in the optimizely client.
    notifier.subscribe(flagKey, () => {
      setState(prevState => ({
        ...prevState,
        ...getCurrentDecision(),
      }));
    });
  }, []);

  useEffect(() => {
    // Subscribe to update after first datafile is fetched and readyPromise is resolved to avoid redundant rendering.
    if (optimizely.getIsReadyPromiseFulfilled() && options.autoUpdate) {
      return setupAutoUpdateListeners(optimizely, HookType.FEATURE, flagKey, hooksLogger, () => {
        setState(prevState => ({
          ...prevState,
          ...getCurrentDecision(),
        }));
      });
    }
    return (): void => {};
  }, [optimizely.getIsReadyPromiseFulfilled(), options.autoUpdate, optimizely, flagKey, getCurrentDecision]);

  return [state.decision, state.clientReady, state.didTimeout];
};
