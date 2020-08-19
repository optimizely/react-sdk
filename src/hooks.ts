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
import { useContext, useEffect, useState, useRef } from 'react';

import { UserAttributes } from '@optimizely/optimizely-sdk';
import { getLogger, LoggerFacade } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { OnReadyResult, ReactSDKClient, VariableValuesObject } from './client';
import { OptimizelyContext } from './Context';

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

export interface FeatureDecisionValues {
  isEnabled: boolean;
  variables: VariableValuesObject;
}

// TODO - Get these from the core SDK once it's typed
interface ExperimentDecisionValues {
  variation: string | null;
}

interface UseExperimentState extends InitializationState, ExperimentDecisionValues {}

interface UseFeatureState extends InitializationState, FeatureDecisionValues {}

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
  return oldAttrsKeys.every((oldAttrKey: string) => {
    return oldAttrKey in newAttrs && oldAttrs[oldAttrKey] === newAttrs[oldAttrKey];
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

  // We need to refresh the auto update listener whenever its dependencies change.

  // Use a ref to track override attrs as an effect dependency - since it's an object we can't
  // rely on the default Object.is equality test, so use this ref to manually update it according
  // to our custom equality function.
  const overrideAttrsRef = useRef<UserAttributes | undefined>();
  if (!areAttributesEqual(overrideAttrsRef.current, overrides.overrideAttributes)) {
    overrideAttrsRef.current = overrides.overrideAttributes;
  }
  useEffect(() => {
    if (!isClientReady || options.autoUpdate) {
      // TODO: pass correct hook type (not always FEATURE)
      return setupAutoUpdateListeners(optimizely, HookType.FEATURE, entityKey, hooksLogger, () => {
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
  const { optimizely } = useContext(OptimizelyContext);
  if (!optimizely) {
    throw new Error('optimizely prop must be supplied via a parent <OptimizelyProvider>');
  }

  const getCurrentValues = (): ExperimentDecisionValues => ({
    variation: optimizely.activate(experimentKey, overrides.overrideUserId, overrides.overrideAttributes),
  });

  const [experimentDecision, initializationState] = useDecision<ExperimentDecisionValues>(
    optimizely,
    experimentKey,
    getCurrentValues,
    { variation: null },
    options,
    overrides
  );
  return [experimentDecision.variation, initializationState.clientReady, initializationState.didTimeout];
};
