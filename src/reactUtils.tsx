/**
 * Copyright 2026 Optimizely
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

import hoistNonReactStatics from 'hoist-non-react-statics';
import * as React from 'react';

export interface AcceptsForwardedRef<R> {
  forwardedRef?: React.Ref<R>;
}

export function hoistStaticsAndForwardRefs<R, P extends AcceptsForwardedRef<R>>(
  Target: React.ComponentType<P>,
  Source: React.ComponentType<any>,
  displayName: string
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>> {
  // Make sure to hoist statics and forward any refs through from Source to Target
  // From the React docs:
  //   https://reactjs.org/docs/higher-order-components.html#static-methods-must-be-copied-over
  //   https://reactjs.org/docs/forwarding-refs.html#forwarding-refs-in-higher-order-components
  const forwardRef: React.ForwardRefRenderFunction<R, P> = (props, ref) => <Target {...props} forwardedRef={ref} />;
  forwardRef.displayName = `${displayName}(${Source.displayName || Source.name})`;
  return hoistNonReactStatics<
    React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>,
    React.ComponentType<any>
  >(React.forwardRef(forwardRef), Source);
}
