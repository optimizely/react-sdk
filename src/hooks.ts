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

import { UserAttributes } from '@optimizely/optimizely-sdk';
import { getLogger, LoggerFacade } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { ReactSDKClient, VariableValuesObject, OnReadyResult } from './client';
import { OptimizelyContext } from './Context';
import { areAttributesEqual } from './utils';

const hooksLogger: LoggerFacade = getLogger('ReactSDK');

enum HookType {
  EXPERIMENT = 'Experiment',
  FEATURE = 'Feature',
}

type HookOptions = {
  autoUpdate?: boolean;
  timeout?: number;
};

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
 * Hook providing access to initialization state for the argument client (readiness, and whether or not a timeout occurred
 * based on the timeout passed in or set on the ancestor OptimizelyProvider)
 * @param {ReactSDKClient} optimizely
 * @param {HookOptions} [options]
 * @returns InitializationState
 */
function useClientInitializationState(optimizely: ReactSDKClient, options: HookOptions = {}): InitializationState {
  const { timeout, isServerSide } = useContext(OptimizelyContext);
  const isClientReady = optimizely.isReady() || isServerSide;

  const [initializationState, setInitializationState] = useState<InitializationState>(() => ({
    clientReady: isClientReady,
    didTimeout: false,
  }));

  // Update initialization state when any of these occur:
  // - Client instance changed
  // - Timeout (obtained from provider or passed in) changed
  // - onReady promise signaled timeout elapsed
  // - client became ready
  const finalReadyTimeout: number | undefined = options.timeout !== undefined ? options.timeout : timeout;
  useEffect(() => {
    if (isClientReady) {
      return;
    }

    optimizely
      .onReady({ timeout: finalReadyTimeout })
      .then((res: OnReadyResult) => {
        if (res.success) {
          hooksLogger.info('Client became ready');
          setInitializationState({
            clientReady: true,
            didTimeout: false,
          });
          return;
        }
        hooksLogger.info(
          `Client did not become ready before timeout of ${finalReadyTimeout}ms, reason="${res.reason || ''}"`
        );
        setInitializationState({
          clientReady: false,
          didTimeout: true,
        });
        res.dataReadyPromise!.then(() => {
          hooksLogger.info('Client became ready after timeout already elapsed');
          setInitializationState({
            clientReady: true,
            didTimeout: true,
          });
        });
      })
      .catch(() => {
        hooksLogger.error(`Error initializing client. The core client or user promise(s) rejected.`);
      });
  }, [isClientReady, optimizely, finalReadyTimeout]);

  return initializationState;
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
  const { optimizely, isServerSide } = useContext(OptimizelyContext);
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
  const [decisionState, setDecisionState] = useState<ExperimentDecisionValues>(() => {
    if (isClientReady) {
      return getCurrentDecision();
    }
    return { variation: null };
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
    setDecisionState(getCurrentDecision());
  }

  useEffect(() => {
    if (!isClientReady || options.autoUpdate) {
      return setupAutoUpdateListeners(optimizely, HookType.EXPERIMENT, experimentKey, hooksLogger, () => {
        setDecisionState(getCurrentDecision());
      });
    }
    return (): void => {};
  }, [isClientReady, options.autoUpdate, optimizely, experimentKey, setDecisionState, getCurrentDecision]);

  const initializationState = useClientInitializationState(optimizely, options);

  return [decisionState.variation, initializationState.clientReady, initializationState.didTimeout];
};

/**
 * A React Hook that retrieves the status of a feature flag and its variables, optionally
 * auto updating those values based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useFeature: UseFeature = (featureKey, options = {}, overrides = {}) => {
  const { optimizely, isServerSide } = useContext(OptimizelyContext);
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
  const [decisionState, setDecisionState] = useState<FeatureDecisionValues>(() => {
    if (isClientReady) {
      return getCurrentDecision();
    }
    return { isEnabled: false, variables: {} };
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
    setDecisionState(getCurrentDecision());
  }

  useEffect(() => {
    if (!isClientReady || options.autoUpdate) {
      return setupAutoUpdateListeners(optimizely, HookType.FEATURE, featureKey, hooksLogger, () => {
        setDecisionState(getCurrentDecision());
      });
    }
    return (): void => {};
  }, [isClientReady, options.autoUpdate, optimizely, featureKey, setDecisionState, getCurrentDecision]);

  const initializationState = useClientInitializationState(optimizely, options);

  return [
    decisionState.isEnabled,
    decisionState.variables,
    initializationState.clientReady,
    initializationState.didTimeout,
  ];
};
