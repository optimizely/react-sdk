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
import { useCallback, useContext, useEffect, useState } from 'react';
import { UserAttributes } from '@optimizely/optimizely-sdk';
import { getLogger } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { VariableValuesObject, OnReadyResult } from './client';
import { OptimizelyContext } from './Context';

const useFeatureLogger = getLogger('useFeature');

type UseFeatureState = {
  isEnabled: boolean;
  variables: VariableValuesObject;
};

type ClientReady = boolean;
type DidTimeout = boolean;

type UseFeatureOptions = {
  autoUpdate?: boolean;
  timeout?: number;
};

type UseFeatureOverrides = {
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
};

interface UseFeature {
  (featureKey: string, options?: UseFeatureOptions, overrides?: UseFeatureOverrides): [
    UseFeatureState['isEnabled'],
    UseFeatureState['variables'],
    ClientReady,
    DidTimeout
  ];
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
  const finalReadyTimeout: number | undefined = options.timeout !== undefined ? options.timeout : timeout;

  // Helper function to return the current values for isEnabled and variables.
  const getCurrentValues = useCallback(
    () => ({
      isEnabled: optimizely.isFeatureEnabled(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
      variables: optimizely.getFeatureVariables(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
    }),
    [featureKey, overrides]
  );

  // Set the initial state immediately serverSide
  const [data, setData] = useState<UseFeatureState>(() => {
    if (isServerSide) {
      return getCurrentValues();
    }
    return { isEnabled: false, variables: {} };
  });

  const [clientReady, setClientReady] = useState(isServerSide ? true : false);
  const [didTimeout, setDidTimeout] = useState(false);

  useEffect(() => {
    const cleanupFns: Array<() => void> = [];

    optimizely
      .onReady({ timeout: finalReadyTimeout })
      .then((res: OnReadyResult) => {
        if (res.success) {
          // didTimeout=false
          useFeatureLogger.info(`feature="${featureKey}" successfully set for user="${optimizely.user.id}"`);
          return;
        }
        setDidTimeout(true);
        useFeatureLogger.info(
          `feature="${featureKey}" could not be set before timeout of ${finalReadyTimeout}ms, reason="${res.reason ||
            ''}"`
        );
        // Since we timed out, wait for the dataReadyPromise to resolve before setting up.
        return res.dataReadyPromise!.then(() => {
          useFeatureLogger.info(`feature="${featureKey}" is now set, but after timeout.`);
        });
      })
      .then(() => {
        setClientReady(true);
        setData(getCurrentValues());
        if (options.autoUpdate) {
          cleanupFns.push(
            setupAutoUpdateListeners(optimizely, 'feature', featureKey, useFeatureLogger, () => {
              if (cleanupFns.length) {
                setData(getCurrentValues());
              }
            })
          );
        }
      })
      .catch(() => {
        /* The user promise or core client promise rejected. */
        useFeatureLogger.error(`Error initializing client. The core client or user promise(s) rejected.`);
      });

    return () => {
      while (cleanupFns.length) {
        cleanupFns.shift()!();
      }
    };
  }, [optimizely]);

  return [data.isEnabled, data.variables, clientReady, didTimeout];
};
