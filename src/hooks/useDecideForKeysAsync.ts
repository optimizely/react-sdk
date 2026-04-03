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

import { useCallback, useEffect, useState } from 'react';
import type { OptimizelyDecision, OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { useOptimizelyContext } from './useOptimizelyContext';
import { useProviderState } from './useProviderState';
import { useStableArray } from './useStableArray';
import { useAsyncDecision } from './useAsyncDecision';
import type { UseDecideConfig } from './useDecide';

export type UseDecideMultiAsyncResult =
  | { isLoading: true; error: null; decisions: Record<string, never> }
  | { isLoading: false; error: Error; decisions: Record<string, never> }
  | { isLoading: false; error: null; decisions: Record<string, OptimizelyDecision> };

const EMPTY_DECISIONS = {} as Record<string, never>;

/**
 * Returns feature flag decisions for the given flag keys using the async
 * `decideForKeysAsync` API. Required for CMAB (Contextual Multi-Armed Bandit) support.
 *
 * Client-side only — `decideForKeysAsync` returns a Promise which cannot resolve
 * during server render.
 *
 * @param flagKeys - The feature flag keys to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideForKeysAsync(flagKeys: string[], config?: UseDecideConfig): UseDecideMultiAsyncResult {
  const { store, client } = useOptimizelyContext();
  const stableKeys = useStableArray(flagKeys);
  const decideOptions = useStableArray(config?.decideOptions);
  const state = useProviderState(store);

  // --- Forced decision subscription — per-key with shared version counter ---
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    const unsubscribes = stableKeys.map((key) => store.subscribeForcedDecision(key, () => setFdVersion((v) => v + 1)));
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [store, stableKeys]);

  const execute = useCallback(
    (uc: OptimizelyUserContext) => uc.decideForKeysAsync(stableKeys, decideOptions),
    [stableKeys, decideOptions]
  );

  const { result, error, isLoading } = useAsyncDecision(state, client, fdVersion, EMPTY_DECISIONS, execute);

  return { decisions: result, error, isLoading } as UseDecideMultiAsyncResult;
}
