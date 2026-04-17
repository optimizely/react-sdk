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

import { useCallback, useMemo } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { useOptimizelyContext } from './useOptimizelyContext';

export type UseOptimizelyUserContextResult =
  | { isLoading: true; error: null; userContext: null }
  | { isLoading: false; error: Error; userContext: OptimizelyUserContext | null }
  | { isLoading: false; error: null; userContext: OptimizelyUserContext };

/**
 * Returns the current {@link OptimizelyUserContext} for the nearest `<OptimizelyProvider>`.
 *
 * The user context gives access to the user's identity (user ID and attributes)
 * and methods for working with forced decisions (`setForcedDecision`,
 * `removeForcedDecision`, `removeAllForcedDecisions`).
 */
export function useOptimizelyUserContext(): UseOptimizelyUserContextResult {
  const { store } = useOptimizelyContext();

  const subscribe = useCallback((onStoreChange: () => void) => store.subscribe(onStoreChange), [store]);
  const getSnapshot = useCallback(() => store.getState(), [store]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(() => {
    const { userContext, error } = state;

    if (userContext !== null) {
      return { userContext, isLoading: false, error };
    }

    if (error) {
      return { userContext: null, isLoading: false, error };
    }

    return { userContext: null, isLoading: true, error: null };
  }, [state]);
}
