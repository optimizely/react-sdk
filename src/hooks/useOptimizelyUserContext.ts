/**
 * Copyright 2026, Optimizely
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

import { useContext, useState, useEffect, useRef } from 'react';
import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { OptimizelyContext } from '../provider/index';

/**
 * Returns the current OptimizelyUserContext from the ProviderStateStore.
 *
 * The returned context has wrapped forced decision methods — calling
 * `setForcedDecision()`, `removeForcedDecision()`, or `removeAllForcedDecisions()`
 * on it will automatically trigger React re-renders in hooks watching the affected flags.
 *
 * Returns `null` while the SDK is initializing or if the user context has not been created yet.
 */
export function useOptimizelyUserContext(): OptimizelyUserContext | null {
  const context = useContext(OptimizelyContext);

  if (!context) {
    throw new Error('useOptimizelyUserContext must be used within an <OptimizelyProvider>');
  }

  const { store } = context;

  const [userContext, setUserContext] = useState<OptimizelyUserContext | null>(() => store.getState().userContext);
  // const userContextRef = useRef(userContext);
  // userContextRef.current = userContext;

  useEffect(() => {
    // // Sync in case state changed between render and effect
    // const currentContext = store.getState().userContext;
    // if (currentContext !== userContextRef.current) {
    //   setUserContext(currentContext);
    // }
    setUserContext(store.getState().userContext);
    const unsubscribe = store.subscribe((state) => {
      setUserContext(state.userContext);
    });

    return unsubscribe;
  }, [store]);

  return userContext;
}
