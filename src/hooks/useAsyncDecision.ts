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

import { useEffect, useRef, useState } from 'react';
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

  const prevUserContextRef = useRef<OptimizelyUserContext | null>(null);

  useEffect(() => {
    const { userContext, error } = state;
    const hasConfig = client.getOptimizelyConfig() !== null;

    // No decision possible — surface store error or stay loading
    if (!hasConfig || userContext === null) {
      if (error) {
        setAsyncState({ result: emptyResult, error, isLoading: false });
      } else {
        setAsyncState((prev) => {
          if (prev.isLoading) return prev;
          return { result: emptyResult, error: null, isLoading: true };
        });
      }
      return;
    }

    const userContextChanged = userContext !== prevUserContextRef.current;
    prevUserContextRef.current = userContext;

    setAsyncState((prev) => {
      if (prev.isLoading) return prev;
      return { result: userContextChanged ? emptyResult : prev.result, error: null, isLoading: true };
    });

    // Config + userContext available — fire async decision even if store has error
    let cancelled = false;

    execute(userContext).then(
      (result) => {
        if (!cancelled) {
          setAsyncState({ result, error, isLoading: false });
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
