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

import { useExperiment } from './hooks';
import { VariationProps } from './Variation';
import { VariableValuesObject } from './client';
import { withOptimizely, WithOptimizelyProps } from './withOptimizely';

export type ChildrenRenderFunction = (variableValues: VariableValuesObject) => React.ReactNode;

type ChildRenderFunction = (variation: string | null, clientReady: boolean, didTimeout: boolean) => React.ReactNode;

export interface ExperimentProps extends WithOptimizelyProps {
  // TODO add support for overrideUserId
  experiment: string;
  autoUpdate?: boolean;
  timeout?: number;
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
  children: React.ReactNode | ChildRenderFunction;
}

export interface ExperimentState {
  canRender: boolean;
  variation: string | null;
}

const Experiment: React.FunctionComponent<ExperimentProps> = props => {
  const { experiment, timeout, autoUpdate, children, overrideUserId, overrideAttributes } = props;
  const [variation, clientReady, didTimeout] = useExperiment(
    experiment,
    { timeout, autoUpdate },
    { overrideUserId, overrideAttributes }
  );

  if (!clientReady && !didTimeout) {
    // Only block rendering while were waiting for the client within the allowed timeout.
    return null;
  }

  if (children != null && typeof children === 'function') {
    // Wrap the return value here in a Fragment to please the HOC's expected React.ComponentType
    // See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18051
    return <>{(children as ChildRenderFunction)(variation, clientReady, didTimeout)}</>;
  }

  let match: React.ReactElement<VariationProps> | null = null;

  // We use React.Children.forEach instead of React.Children.toArray().find()
  // here because toArray adds keys to all child elements and we do not want
  // to trigger an unmount/remount
  React.Children.forEach(children, (child: React.ReactElement<VariationProps>) => {
    if (match || !React.isValidElement(child)) {
      return;
    }

    if (child.props.variation) {
      if (variation === child.props.variation) {
        match = child;
      }
    } else if (child.props.default) {
      match = child;
    }
  });

  return match ? React.cloneElement(match, { variation }) : null;
};

export const OptimizelyExperiment = withOptimizely(Experiment);
