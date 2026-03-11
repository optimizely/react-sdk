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
import type { OptimizelyDecideOption, OptimizelyDecision } from '@optimizely/optimizely-sdk';

import { useOptimizelyContext } from './useOptimizelyContext';
import { useStableArray } from './useStableArray';
import { createDefaultDecision } from '../utils/helpers';

export interface UseDecideConfig {
  decideOptions?: OptimizelyDecideOption[];
}

export interface UseDecideResult {
  decision: OptimizelyDecision;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Returns a feature flag decision for the given flag key.
 *
 * Subscribes to `ProviderStateStore` via `useSyncExternalStore` and
 * re-evaluates the decision whenever the store state changes
 * (client ready, user context set, error).
 *
 * @param flagKey - The feature flag key to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecide(flagKey: string, config?: UseDecideConfig): UseDecideResult {
  const { store, client } = useOptimizelyContext();
  const decideOptions = useStableArray(config?.decideOptions);
  const defaultDecision = useMemo(
    () => createDefaultDecision(flagKey, 'Optimizely SDK not configured properly yet.'),
    [flagKey]
  );

  // --- General state subscription ---
  // store.getState() returns a new object on every state change,
  // so Object.is comparison works naturally.
  const subscribeState = useCallback((onStoreChange: () => void) => store.subscribe(onStoreChange), [store]);
  const getStateSnapshot = useCallback(() => store.getState(), [store]);
  const state = useSyncExternalStore(subscribeState, getStateSnapshot, getStateSnapshot);

  // --- Derive decision ---
  return useMemo(() => {
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    if (error) {
      return { decision: defaultDecision, isLoading: false, error };
    }

    if (!hasConfig || userContext === null) {
      return { decision: defaultDecision, isLoading: true, error: null };
    }

    const decision = userContext.decide(flagKey, decideOptions);
    return { decision, isLoading: false, error: null };
  }, [state, client, flagKey, decideOptions, defaultDecision]);
}
