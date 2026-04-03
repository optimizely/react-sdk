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

import { useEffect, useState } from 'react';
import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import type { Client } from '@optimizely/optimizely-sdk';
import type { ProviderState } from '../provider/index';

interface AsyncState<TResult> {
  result: TResult;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Shared async decision state machine used by useDecideAsync,
 * useDecideForKeysAsync, and useDecideAllAsync.
 *
 * Handles: loading state, error propagation, cancellation of stale promises,
 * and redundant re-render avoidance on first mount.
 *
 * @param state - Provider state from useProviderState
 * @param client - Optimizely client instance
 * @param fdVersion - Forced decision version counter (triggers re-evaluation)
 * @param emptyResult - Default/empty result value (null for single, {} for multi)
 * @param execute - Callback that performs the async SDK call
 */
export function useAsyncDecision<TResult>(
  state: ProviderState,
  client: Client,
  fdVersion: number,
  emptyResult: TResult,
  execute: (userContext: OptimizelyUserContext) => Promise<TResult>
): AsyncState<TResult> {
  const [asyncState, setAsyncState] = useState<AsyncState<TResult>>({
    result: emptyResult,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    // Store-level error — no async call needed
    if (error) {
      setAsyncState({ result: emptyResult, error, isLoading: false });
      return;
    }

    // Store not ready — stay in loading
    if (!hasConfig || userContext === null) {
      setAsyncState({ result: emptyResult, error: null, isLoading: true });
      return;
    }

    // Store is ready — fire async decision
    let cancelled = false;
    // Reset to loading before firing the async call.
    // If already in the initial loading state, returns `prev` as-is to
    // skip a redundant re-render on first mount.
    setAsyncState((prev) => {
      if (prev.isLoading && prev.error === null && prev.result === emptyResult) return prev;
      return { result: emptyResult, error: null, isLoading: true };
    });

    execute(userContext).then(
      (result) => {
        if (!cancelled) {
          setAsyncState({ result, error: null, isLoading: false });
        }
      },
      (err) => {
        if (!cancelled) {
          setAsyncState({
            result: emptyResult,
            error: err instanceof Error ? err : new Error(String(err)),
            isLoading: false,
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [state, fdVersion, client, execute, emptyResult]);

  return asyncState;
}
