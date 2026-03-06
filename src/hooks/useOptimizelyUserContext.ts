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

import { useContext, useCallback } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { OptimizelyContext } from '../provider/index';

/**
 * Returns the current {@link OptimizelyUserContext} for the nearest `<OptimizelyProvider>`.
 *
 * The user context gives access to the user's identity (user ID and attributes)
 * and methods for working with forced decisions (`setForcedDecision`,
 * `removeForcedDecision`, `removeAllForcedDecisions`).
 *
 * Returns `null` while the SDK is initializing or if no user has been set yet.
 */

export function useOptimizelyUserContext(): OptimizelyUserContext | null {
  const context = useContext(OptimizelyContext);

  if (!context) {
    throw new Error('useOptimizelyUserContext must be used within an <OptimizelyProvider>');
  }

  const { store } = context;

  const subscribe = useCallback((onStoreChange: () => void) => store.subscribe(onStoreChange), [store]);

  const getSnapshot = useCallback(() => store.getState().userContext, [store]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
