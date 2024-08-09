/**
 * Copyright 2018-2019, 2023, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
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

export type ChildrenRenderFunction = (
  variation: string | null,
  clientReady?: boolean,
  didTimeout?: boolean
) => React.ReactNode;

export interface ExperimentProps {
  // TODO add support for overrideUserId
  experiment: string;
  autoUpdate?: boolean;
  timeout?: number;
  overrideUserId?: string;
  overrideAttributes?: UserAttributes;
  children: React.ReactNode | ChildrenRenderFunction;
}

const Experiment: React.FunctionComponent<ExperimentProps> = (props) => {
  const { experiment, autoUpdate, timeout, overrideUserId, overrideAttributes, children } = props;
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
    return <>{(children as ChildrenRenderFunction)(variation, clientReady, didTimeout)}</>;
  }

  let defaultMatch: React.ReactElement<VariationProps> | null = null;
  let variationMatch: React.ReactElement<VariationProps> | null = null;

  // We use React.Children.forEach instead of React.Children.toArray().find()
  // here because toArray adds keys to all child elements and we do not want
  // to trigger an unmount/remount
  React.Children.forEach(children, (child: React.ReactElement<VariationProps>) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (child.props.variation) {
      if (variation === child.props.variation) {
        variationMatch = child;
      }
    }
    // Last child with default prop wins
    if (child.props.default) {
      defaultMatch = child;
    }
  });

  let match: React.ReactElement<VariationProps> | null = null;
  if (variationMatch) {
    match = variationMatch;
  } else if (defaultMatch) {
    match = defaultMatch;
  }
  return match;
};

export const OptimizelyExperiment = Experiment;
