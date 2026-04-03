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
import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { useOptimizelyContext } from './useOptimizelyContext';
import { useProviderState } from './useProviderState';
import { useStableArray } from './useStableArray';
import { useAsyncDecision } from './useAsyncDecision';
import type { UseDecideConfig } from './useDecide';
import type { UseDecideMultiAsyncResult } from './useDecideForKeysAsync';

const EMPTY_DECISIONS = {} as Record<string, never>;

/**
 * Returns feature flag decisions for all flags using the async
 * `decideAllAsync` API. Required for CMAB (Contextual Multi-Armed Bandit) support.
 *
 * Client-side only — `decideAllAsync` returns a Promise which cannot resolve
 * during server render.
 *
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideAllAsync(config?: UseDecideConfig): UseDecideMultiAsyncResult {
  const { store, client } = useOptimizelyContext();
  const decideOptions = useStableArray(config?.decideOptions);
  const state = useProviderState(store);

  // --- Forced decision subscription — any flag key ---
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    return store.subscribeAllForcedDecisions(() => setFdVersion((v) => v + 1));
  }, [store]);

  const execute = useCallback((uc: OptimizelyUserContext) => uc.decideAllAsync(decideOptions), [decideOptions]);

  const { result, error, isLoading } = useAsyncDecision(state, client, fdVersion, EMPTY_DECISIONS, execute);

  return { decisions: result, error, isLoading } as UseDecideMultiAsyncResult;
}
