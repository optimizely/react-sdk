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
import { Dispatch, EffectCallback, SetStateAction, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { UserAttributes } from '@optimizely/optimizely-sdk';
import { getLogger, LoggerFacade } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { ReactSDKClient, VariableValuesObject, OnReadyResult } from './client';
import { OptimizelyContext } from './Context';

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

interface HookStateBase {
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

interface UseExperimentState extends HookStateBase, ExperimentDecisionValues {}

interface UseFeatureState extends HookStateBase, FeatureDecisionValues {}

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

interface DecisionProps {
  featureKey: string;
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
}

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

function areDecisionPropsEqual(previousDecisionProps: DecisionProps, newDecisionProps: DecisionProps): boolean {
  return (
    previousDecisionProps.featureKey === newDecisionProps.featureKey &&
    previousDecisionProps.overrideUserId === newDecisionProps.overrideUserId &&
    areAttributesEqual(previousDecisionProps.overrideAttributes, newDecisionProps.overrideAttributes)
  );
}

/**
 * A React Hook that retrieves the status of a feature flag and its variables, optionally
 * auto updating those values based on underlying user or datafile changes.
 *
 * Note: The react client can become ready AFTER the timeout period.
 *       ClientReady and DidTimeout provide signals to handle this scenario.
 */
export const useFeature: UseFeature = (featureKey, options = {}, overrides = {}) => {
  const { isServerSide, optimizely, timeout } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  // Feature decision state is derived from featureKey and overrides arguments.
  // Track the previous value of those, and update state when they change
  const currentDecisionProps: DecisionProps = {
    featureKey,
    overrideUserId: overrides.overrideUserId,
    overrideAttributes: overrides.overrideAttributes,
  };
  const [prevDecisionProps, setPrevDecisionProps] = useState<DecisionProps>(currentDecisionProps);
  const decisionPropsChanged = !areDecisionPropsEqual(prevDecisionProps, currentDecisionProps);

  const getCurrentDecisionValues = (): FeatureDecisionValues => ({
    isEnabled: optimizely.isFeatureEnabled(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
    variables: optimizely.getFeatureVariables(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
  });

  const isClientReady = isServerSide || optimizely.isReady();

  const featureStateAndSetter = useState<FeatureDecisionValues>(() => {
    if (isClientReady) {
      return getCurrentDecisionValues();
    }
    return {
      isEnabled: false,
      variables: {},
    };
  });
  let featureDecisionState = featureStateAndSetter[0];
  const setFeatureDecisionState = featureStateAndSetter[1];

  // console.warn(prevDecisionProps, currentDecisionProps);
  if (decisionPropsChanged) {
    console.warn('!!! decision props changed, old = ', prevDecisionProps, ', new = ', currentDecisionProps);
    // setPrevDecisionProps(currentDecisionProps);
    // featureDecisionState = getCurrentDecisionValues();
    // setFeatureDecisionState(featureDecisionState);
  } else {
    console.warn('<<<< decision props did not change');
  }

  const [initializationState, setInitializationState] = useState<HookStateBase>(() => ({
    clientReady: isClientReady,
    didTimeout: false,
  }));

  // Add listener to update decision state when datafile or user change
  useEffect(() => {
    if (!isClientReady || options.autoUpdate) {
      return setupAutoUpdateListeners(optimizely, HookType.FEATURE, featureKey, getLogger('useFeature'), () => {
        setFeatureDecisionState(getCurrentDecisionValues());
      });
    }
    return (): void => {};
    // TODO: deps should include overrides
  }, [optimizely, featureKey]);

  // Update initialization state when any of these occur:
  // - Client instance changed
  // - Timeout (obtained from provider or passed in) changed
  // - onReady promise signaled timeout elapsed or client became ready
  const finalReadyTimeout: number | undefined = options.timeout !== undefined ? options.timeout : timeout;
  useEffect(() => {
    if (isClientReady) {
      return;
    }

    const logger: LoggerFacade = getLogger('useFeature');
    optimizely
      .onReady({ timeout: finalReadyTimeout })
      .then((res: OnReadyResult) => {
        if (res.success) {
          logger.info('Client became ready');
          setInitializationState({
            clientReady: true,
            didTimeout: false,
          });
          return;
        }
        logger.info(
          `Client did not become ready before timeout of ${finalReadyTimeout}ms, reason="${res.reason || ''}"`
        );
        setInitializationState({
          clientReady: false,
          didTimeout: true,
        });
        res.dataReadyPromise!.then(() => {
          logger.info('Client became ready after timeout already elapsed');
          setInitializationState({
            clientReady: true,
            didTimeout: true,
          });
        });
      })
      .catch(() => {
        logger.error(`Error initializing client. The core client or user promise(s) rejected.`);
      });
  }, [optimizely, finalReadyTimeout]);

  return [
    featureDecisionState.isEnabled,
    featureDecisionState.variables,
    initializationState.clientReady,
    initializationState.didTimeout,
  ];
};
