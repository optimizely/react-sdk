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
import { useCallback, useContext, useState } from 'react';
import * as optimizely from '@optimizely/optimizely-sdk';
import { getLogger } from '@optimizely/js-sdk-logging';

import { setupAutoUpdateListeners } from './autoUpdate';
import { OptimizelyContext } from './Context';

type UseFeatureOptions = {
  autoUpdate?: Boolean,
};

type UseFeatureOverrides = {
  overrideUserId?: string,
  overrideAttributes?: optimizely.UserAttributes,
}

export const useFeature = (featureKey: string, options: UseFeatureOptions, overrides: UseFeatureOverrides = {}): [Boolean, Object] => {
  const { optimizely } = useContext(OptimizelyContext);
  const [ data, setData ] = useState({ isFeatureEnabled: false, variables: {}});
  useCallback(() => {
    if (!optimizely) {
      return;
    }
    const logger = getLogger('useFeature');
    setData({
      isFeatureEnabled: optimizely.isFeatureEnabled(featureKey, overrides.overrideUserId, overrides.overrideAttributes),
      variables: optimizely.getFeatureVariables(featureKey, overrides.overrideUserId, overrides.overrideAttributes)
    })
    if (options.autoUpdate) {
      setupAutoUpdateListeners(optimizely, featureKey, logger, setData)
    }
  }, [optimizely]);

  return [
    data.isFeatureEnabled,
    data.variables
  ];
};
