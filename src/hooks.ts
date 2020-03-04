/**
 * Copyright 2019-2020, Optimizely
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
import { useCallback, useEffect, useContext, useState } from 'react';
import * as optimizely from '@optimizely/optimizely-sdk';
import { getLogger } from '@optimizely/js-sdk-logging';

import { VariableValuesObject, OnReadyResult, DEFAULT_ON_READY_TIMEOUT } from './client'
import { setupAutoUpdateListeners } from './autoUpdate';
import { OptimizelyContext } from './Context';

type UseFeatureState = {
  isEnabled: Boolean,
  variables: VariableValuesObject,
};

type UseFeatureOptions = {
  autoUpdate?: Boolean,
  timeout?: number
};

type UseFeatureOverrides = {
  overrideUserId?: string,
  overrideAttributes?: optimizely.UserAttributes,
}

interface UseFeature {
  (
    featureKey: string,
    options?: UseFeatureOptions,
    overrides?: UseFeatureOverrides,
  ): [Boolean, VariableValuesObject]
}

/**
 * 
 */
export const useFeature : UseFeature = (featureKey, options = {}, overrides = {}) => {
  const { isServerSide, optimizely, timeout } = useContext(OptimizelyContext);

  // Helper function to return the current values for isEnabled and variables.
  const getCurrentValues = useCallback(() => ({
    isEnabled: optimizely ? optimizely.isFeatureEnabled(featureKey, overrides.overrideUserId, overrides.overrideAttributes) : false,
    variables: optimizely ? optimizely.getFeatureVariables(featureKey, overrides.overrideUserId, overrides.overrideAttributes) : {},
  }), [featureKey, overrides]);

  // Set the initial state immediately serverSide
  const [ data, setData ] = useState<UseFeatureState>(() => {
    if (isServerSide) {
      if (optimizely === null) {
        throw new Error('optimizely prop must be supplied')
      }
      return getCurrentValues();
    }
    return { isEnabled: false, variables: {}};
  });

  useEffect(() => {
    if (!optimizely) {
      return;
    }
    const logger = getLogger('useFeature');
    const cleanupFns: Array<() => void> = [];

    optimizely.onReady({ timeout }).then((res: OnReadyResult) => {
      if (res.success) {
        logger.info('feature="%s" successfully rendered for user="%s"', featureKey, optimizely.user.id)
      } else {
        logger.info(
          'feature="%s" could not be checked before timeout of %sms, reason="%s" ',
          featureKey,
          timeout === undefined ? DEFAULT_ON_READY_TIMEOUT : timeout,
          res.reason || '',
        )
      }
      setData(getCurrentValues());
      if (options.autoUpdate) {
        cleanupFns.push(
          setupAutoUpdateListeners(optimizely, 'feature', logger, () => setData(getCurrentValues()))
        );
      }
    });

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [optimizely]);

  return [
    data.isEnabled,
    data.variables
  ];
};
