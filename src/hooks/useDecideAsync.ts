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
import type { UseDecideConfig, UseDecideResult } from './types';

/**
 * Returns a feature flag decision for the given flag key using the async
 * `decideAsync` API. Required for CMAB (Contextual Multi-Armed Bandit) support.
 *
 * Client-side only — `decideAsync` returns a Promise which cannot resolve
 * during server render.
 *
 * @param flagKey - The feature flag key to evaluate
 * @param config - Optional configuration (decideOptions)
 */
export function useDecideAsync(flagKey: string, config?: UseDecideConfig): UseDecideResult {
  const { store, client } = useOptimizelyContext();
  const decideOptions = useStableArray(config?.decideOptions);
  const state = useProviderState(store);

  // --- Forced decision subscription ---
  const [fdVersion, setFdVersion] = useState(0);
  useEffect(() => {
    return store.subscribeForcedDecision(flagKey, () => {
      setFdVersion((v) => v + 1);
    });
  }, [store, flagKey]);

  const execute = useCallback(
    (uc: OptimizelyUserContext) => uc.decideAsync(flagKey, decideOptions),
    [flagKey, decideOptions]
  );

  const { result, error, isLoading } = useAsyncDecision(state, client, fdVersion, null, execute);

  return { decision: result, error, isLoading } as UseDecideResult;
}
