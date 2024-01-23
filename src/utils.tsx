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

import hoistNonReactStatics from 'hoist-non-react-statics';
import * as optimizely from '@optimizely/optimizely-sdk';
import * as React from 'react';

export type UserInfo = {
  id: string | null;
  attributes?: optimizely.UserAttributes;
};

export interface OptimizelyDecision extends Omit<optimizely.OptimizelyDecision, 'userContext'> {
  userContext: UserInfo;
}

export function areUsersEqual(user1: UserInfo, user2: UserInfo): boolean {
  if (user1.id !== user2.id) {
    return false;
  }

  const user1keys = Object.keys(user1.attributes || {});
  const user2keys = Object.keys(user2.attributes || {});
  user1keys.sort();
  user2keys.sort();

  const user1Attributes = user1.attributes || {};
  const user2Attributes = user2.attributes || {};

  const areKeysLenEqual = user1keys.length === user2keys.length;
  if (!areKeysLenEqual) {
    return false;
  }

  for (let i = 0; i < user1keys.length; i++) {
    const key1 = user1keys[i];
    const key2 = user2keys[i];
    if (key1 !== key2) {
      return false;
    }

    if (user1Attributes[key1] !== user2Attributes[key2]) {
      return false;
    }
  }

  return true;
}

export function areObjectsEqual(obj1: any, obj2: any) {
  const obj1Keys = Object.keys(obj1);
  const obj2Keys = Object.keys(obj2);

  if (obj1Keys.length !== obj2Keys.length) {
    return false;
  }

  for (let i = 0; i < obj1Keys.length; i += 1) {
    const key = obj1Keys[i];
    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      if (!areObjectsEqual(obj1[key], obj2[key])) {
        return false;
      }
    } else if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
}

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

function coerceUnknownAttrsValueForComparison(maybeAttrs: unknown): optimizely.UserAttributes {
  if (typeof maybeAttrs === 'object' && maybeAttrs !== null) {
    return maybeAttrs as optimizely.UserAttributes;
  }
  return {} as optimizely.UserAttributes;
}

/**
 * Equality check applied to override user attributes passed into hooks. Used to determine when we need to recompute
 * a decision because a new set of override attributes was passed into a hook.
 * @param {UserAttributes|undefined} oldAttrs
 * @param {UserAttributes|undefined} newAttrs
 * @returns boolean
 */
export function areAttributesEqual(maybeOldAttrs: unknown, maybeNewAttrs: unknown): boolean {
  const oldAttrs = coerceUnknownAttrsValueForComparison(maybeOldAttrs);
  const newAttrs = coerceUnknownAttrsValueForComparison(maybeNewAttrs);
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

export function createFailedDecision(flagKey: string, message: string, user: UserInfo): OptimizelyDecision {
  return {
    enabled: false,
    flagKey: flagKey,
    ruleKey: null,
    variationKey: null,
    variables: {},
    reasons: [message],
    userContext: {
      id: user.id,
      attributes: user.attributes,
    },
  };
}

export function sprintf(format: string, ...args: any[]): string {
  let i = 0;
  return format.replace(/%s/g, () => {
    const arg = args[i++];
    const type = typeof arg;
    if (type === 'function') {
      return arg();
    } else if (type === 'string') {
      return arg;
    } else {
      return String(arg);
    }
  });
}
