/**
 * Copyright 2019, Optimizely
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

import hoistNonReactStatics from 'hoist-non-react-statics'
import * as optimizely from '@optimizely/optimizely-sdk'
import * as React from 'react'

type User = {
  id: string
  attributes: optimizely.UserAttributes
}

export function areUsersEqual(user1: User, user2: User): boolean {
  if (user1.id !== user2.id) {
    return false
  }

  const user1keys = Object.keys(user1.attributes)
  const user2keys = Object.keys(user2.attributes)
  user1keys.sort()
  user2keys.sort()

  const areKeysLenEqual = user1keys.length === user2keys.length
  if (!areKeysLenEqual) {
    return false
  }

  for (let i = 0; i < user1keys.length; i++) {
    const key1 = user1keys[i]
    const key2 = user2keys[i]
    if (key1 !== key2) {
      return false
    }

    if (user1.attributes[key1] !== user2.attributes[key2]) {
      return false
    }
  }

  return true
}

export interface AcceptsForwardedRef<R> {
  forwardedRef?: React.Ref<R>
}

export function hoistStaticsAndForwardRefs<R, P extends AcceptsForwardedRef<R>>(
  Target: React.ComponentType<P>,
  Source: React.ComponentType<any>,
  displayName: string,
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>> {
  // Make sure to hoist statics and forward any refs through from Source to Target
  // From the React docs:
  //   https://reactjs.org/docs/higher-order-components.html#static-methods-must-be-copied-over
  //   https://reactjs.org/docs/forwarding-refs.html#forwarding-refs-in-higher-order-components
  const forwardRef: React.RefForwardingComponent<R, P> = (props, ref) => (
    <Target {...props} forwardedRef={ref} />
  )
  forwardRef.displayName = `${displayName}(${Source.displayName || Source.name})`
  return hoistNonReactStatics<
    React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>,
    React.ComponentType<any>
  >(React.forwardRef(forwardRef), Source)
}
