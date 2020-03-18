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

export type VariationProps = {
  variation?: string;
  default?: any;
  children?: React.ReactNode;
};

// Wrap the return value here in a Fragment to please the HOC's expected React.ComponentType
// See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18051
const Variation: React.FunctionComponent<VariationProps> = ({ children }) => <>{children}</>;

export const OptimizelyVariation = Variation;
