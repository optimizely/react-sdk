/**
 * Copyright 2018-2019, Optimizely
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
import * as React from 'react';
import { UserAttributes } from '@optimizely/optimizely-sdk';

import { VariableValuesObject } from './client';
import { useFeature } from './hooks';

export type ChildrenRenderFunction = (
  isEnabled: boolean,
  variables: VariableValuesObject,
  clientReady: boolean,
  didTimeout: boolean
) => React.ReactNode;

export interface FeatureProps {
  feature: string;
  timeout?: number;
  autoUpdate?: boolean;
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
  children: ChildrenRenderFunction;
}

const FeatureComponent: React.FunctionComponent<FeatureProps> = (props) => {
  const { feature, timeout, autoUpdate, children, overrideUserId, overrideAttributes } = props;
  const [isEnabled, variables, clientReady, didTimeout] = useFeature(
    feature,
    { timeout, autoUpdate },
    { overrideUserId, overrideAttributes }
  );

  if (!clientReady && !didTimeout) {
    // Only block rendering while were waiting for the client within the allowed timeout.
    return null;
  }

  // Wrap the return value here in a Fragment to please the HOC's expected React.ComponentType
  // See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18051
  return <>{children(isEnabled, variables, clientReady, didTimeout)}</>;
};

export const OptimizelyFeature = FeatureComponent;
