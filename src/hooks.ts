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
import { Dispatch, EffectCallback, SetStateAction, useCallback, useContext, useEffect, useState, useRef } from 'react';

import { UserAttributes } from '@optimizely/optimizely-sdk';
import { getLogger, LoggerFacade } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { FeatureDecisionValues, OnReadyResult, ReactSDKClient } from './client';
import { OptimizelyContext } from './Context';

const useFeatureLogger: LoggerFacade = getLogger('useFeature');

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

interface UseExperimentState extends InitializationState, ExperimentDecisionValues {}

interface UseFeatureState extends InitializationState, FeatureDecisionValues {}

type HookState = UseExperimentState | UseFeatureState;

type CurrentDecisionValues = ExperimentDecisionValues | FeatureDecisionValues;

interface UseExperiment {
  (experimentKey: string, options?: HookOptions, overrides?: HookOverrides): [
    UseExperimentState['variation'],
    ClientReady,
    DidTimeout
  ];
}

interface UseFeature {
  (featureKey: string, options?: HookOptions, overrides?: HookOverrides): [
    UseFeatureState['isEnabled'],
    UseFeatureState['variables'],
    ClientReady,
    DidTimeout
  ];
}

/**
 * A function which waits for the optimizely client instance passed to become
 * ready and then sets up initial state and (optionally) autoUpdate listeners
 * for the hook type specified.
 */
const initializeWhenClientReadyFn = (
  type: HookType,
  name: string,
  optimizely: ReactSDKClient,
  options: HookOptions,
  timeout: number | undefined,
  setState: Dispatch<SetStateAction<HookState>>,
  getCurrentDecisionValues: () => CurrentDecisionValues
): EffectCallback => {
  return (): (() => void) => {
    const cleanupFns: Array<() => void> = [];
    const finalReadyTimeout: number | undefined = options.timeout !== undefined ? options.timeout : timeout;
    const logger: LoggerFacade = getLogger(`use${type}`);

    optimizely
      .onReady({ timeout: finalReadyTimeout })
      .then((res: OnReadyResult) => {
        if (res.success) {
          // didTimeout=false
          logger.info(`${type}="${name}" successfully set for user="${optimizely.user.id}"`);
          return;
        }
        setState((state: HookState) => ({ ...state, didTimeout: true }));
        logger.info(
          `${type}="${name}" could not be set before timeout of ${finalReadyTimeout}ms, reason="${res.reason || ''}"`
        );
        // Since we timed out, wait for the dataReadyPromise to resolve before setting up.
        return res.dataReadyPromise!.then(() => {
          logger.info(`${type}="${name}" is now set, but after timeout.`);
        });
      })
      .then(() => {
        setState((state: HookState) => ({ ...state, ...getCurrentDecisionValues(), clientReady: true }));
        if (options.autoUpdate) {
          cleanupFns.push(
            setupAutoUpdateListeners(optimizely, type, name, logger, () => {
              if (cleanupFns.length) {
                setState((state: HookState) => ({ ...state, ...getCurrentDecisionValues() }));
              }
            })
          );
        }
      })
      .catch(() => {
        /* The user promise or core client promise rejected. */
        logger.error(`Error initializing client. The core client or user promise(s) rejected.`);
      });

    return (): void => {
      while (cleanupFns.length) {
        cleanupFns.shift()!();
      }
    };
  };
};

function areAttributesEqual(oldAttrs: UserAttributes | undefined, newAttrs: UserAttributes | undefined): boolean {
  if ((oldAttrs === undefined && newAttrs !== undefined) || (oldAttrs !== undefined && newAttrs === undefined)) {
    // One went from undefined to object - must update
    return false;
  }
  // Now we know, either they are both undefined, or both UserAttributes
  // If either one is undefined, no need to update
  if (oldAttrs === undefined || newAttrs === undefined) {
    return true;
  }
  // Both objects, so must compare
  const oldAttrsKeys = Object.keys(oldAttrs);
  const newAttrsKeys = Object.keys(newAttrs);
  if (oldAttrsKeys.length !== newAttrsKeys.length) {
    // Different attr count - must update
    return false;
  }
  oldAttrsKeys.sort();
  newAttrsKeys.sort();
  return oldAttrsKeys.every((oldAttrKey: string, index: number) => {
    return oldAttrKey === newAttrsKeys[index] && oldAttrs[oldAttrKey] === newAttrs[oldAttrKey];
  });
}

interface DecisionInputs {
  entityKey: string;
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
}

function areDecisionInputsEqual(previousDecisionProps: DecisionInputs, newDecisionProps: DecisionInputs): boolean {
  return (
    previousDecisionProps.entityKey === newDecisionProps.entityKey &&
    previousDecisionProps.overrideUserId === newDecisionProps.overrideUserId &&
    areAttributesEqual(previousDecisionProps.overrideAttributes, newDecisionProps.overrideAttributes)
  );
}

function useDecision<DecisionType>(
  optimizely: ReactSDKClient,
  entityKey: string,
  getCurrentDecisionValues: () => DecisionType,
  initialDecision: DecisionType,
  options: HookOptions = {},
  overrides: HookOverrides = {}
): [DecisionType, InitializationState] {
  const { isServerSide, timeout } = useContext(OptimizelyContext);
  const isClientReady = isServerSide || optimizely.isReady();

  const decisionStateAndSetter = useState<DecisionType>(() => {
    if (isClientReady) {
      return getCurrentDecisionValues();
    }
    return initialDecision;
  });
  let decisionState = decisionStateAndSetter[0];
  const setDecisionState = decisionStateAndSetter[1];

  // Decision state is derived from featureKey and overrides arguments.
  // Track the previous value of those arguments, and update state when they change.
  // This is an instance of the derived state pattern recommended here:
  // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
  // The use case here falls into the general category "fetching external data when props change",
  // discussed here: https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#fetching-external-data-when-props-change.
  const currentDecisionInputs: DecisionInputs = {
    entityKey,
    overrideUserId: overrides.overrideUserId,
    overrideAttributes: overrides.overrideAttributes,
  };
  const [prevDecisionInputs, setPrevDecisionInputs] = useState<DecisionInputs>(currentDecisionInputs);
  if (!areDecisionInputsEqual(prevDecisionInputs, currentDecisionInputs)) {
    setPrevDecisionInputs(currentDecisionInputs);
    decisionState = getCurrentDecisionValues();
    setDecisionState(decisionState);
  }

  const [initializationState, setInitializationState] = useState<InitializationState>(() => ({
    clientReady: isClientReady,
    didTimeout: false,
  }));

  // Use a ref to track override attrs as an effect dependency, in order to
  // trigger the effect when the contents of the attributes object change.
  const overrideAttrsRef = useRef<UserAttributes | undefined>();
  if (!areAttributesEqual(overrideAttrsRef.current, overrides.overrideAttributes)) {
    overrideAttrsRef.current = overrides.overrideAttributes;
  }
  // Add listener to update decision state when datafile or user change
  useEffect(() => {
    if (!isClientReady || options.autoUpdate) {
      // TODO: pass correct hook type (not always FEATURE)
      return setupAutoUpdateListeners(optimizely, HookType.FEATURE, entityKey, useFeatureLogger, () => {
        setDecisionState(getCurrentDecisionValues());
      });
    }
    return (): void => {};
  }, [optimizely, entityKey, overrides.overrideUserId, overrideAttrsRef.current]);

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
          useFeatureLogger.info('Client became ready');
          setInitializationState({
            clientReady: true,
            didTimeout: false,
          });
          return;
        }
        useFeatureLogger.info(
          `Client did not become ready before timeout of ${finalReadyTimeout}ms, reason="${res.reason || ''}"`
        );
        setInitializationState({
          clientReady: false,
          didTimeout: true,
        });
        res.dataReadyPromise!.then(() => {
          useFeatureLogger.info('Client became ready after timeout already elapsed');
          setInitializationState({
            clientReady: true,
            didTimeout: true,
          });
        });
      })
      .catch(() => {
        useFeatureLogger.error(`Error initializing client. The core client or user promise(s) rejected.`);
      });
  }, [optimizely, finalReadyTimeout]);

  return [decisionState, initializationState];
}

/**
 * A React Hook that retrieves the status of a feature flag and its variables, optionally
 * auto updating those values based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useFeature: UseFeature = (featureKey, options = {}, overrides = {}) => {
  const { optimizely } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  const getCurrentValues = (): FeatureDecisionValues => {
    return {
      isEnabled: optimizely.isFeatureEnabled(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
      variables: optimizely.getFeatureVariables(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
    };
  };

  const [featureDecision, initializationState] = useDecision<FeatureDecisionValues>(
    optimizely,
    featureKey,
    getCurrentValues,
    { isEnabled: false, variables: {} },
    options,
    overrides
  );
  return [
    featureDecision.isEnabled,
    featureDecision.variables,
    initializationState.clientReady,
    initializationState.didTimeout,
  ];
};

/**
 * A React Hook that retrieves the variation for an experiment, optionally
 * auto updating that value based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useExperiment: UseExperiment = (experimentKey, options = {}, overrides = {}) => {
  const { isServerSide, optimizely, timeout } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  // Helper function to return the current value for variation.
  const getCurrentValues = useCallback<() => ExperimentDecisionValues>(
    () => ({
      variation: optimizely.activate(experimentKey, overrides.overrideUserId, overrides.overrideAttributes),
    }),
    [experimentKey, overrides]
  );

  // Set the initial state immediately serverSide
  const [state, setState] = useState<UseExperimentState>(() => {
    const initialState = {
      variation: null,
      clientReady: isServerSide ? true : false,
      didTimeout: false,
    };
    if (isServerSide) {
      return { ...initialState, ...getCurrentValues() };
    }
    return initialState;
  });

  useEffect(
    initializeWhenClientReadyFn(
      HookType.EXPERIMENT,
      experimentKey,
      optimizely,
      options,
      timeout,
      setState,
      getCurrentValues
    ),
    [optimizely]
  );

  return [state.variation, state.clientReady, state.didTimeout];
};
