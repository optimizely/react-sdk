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

import React, { createContext, useRef, useMemo, useEffect } from 'react';

import { ProviderStateStore } from './ProviderStateStore';
import type { OptimizelyProviderProps, OptimizelyContextValue } from './types';

// TODO: Replace with proper logger when implemented
const logger = {
  info: (msg: string) => console.info(`[OptimizelyProvider] ${msg}`),
  warn: (msg: string) => console.warn(`[OptimizelyProvider] ${msg}`),
  error: (msg: string) => console.error(`[OptimizelyProvider] ${msg}`),
};

/**
 * React Context for Optimizely.
 */
export const OptimizelyContext = createContext<OptimizelyContextValue | null>(null);

export function OptimizelyProvider({
  client,
  user,
  timeout,
  skipSegments = false,
  children,
}: OptimizelyProviderProps): React.ReactElement {
  const storeRef = useRef<ProviderStateStore | null>(null);
  // Todo: const prevUserRef = useRef<UserInfo | undefined>(undefined);

  if (storeRef.current === null) {
    storeRef.current = new ProviderStateStore();
  }

  const store = storeRef.current;

  const contextValue = useMemo<OptimizelyContextValue>(
    () => ({
      store,
      client,
    }),
    [store, client]
  );

  useEffect(() => {
    if (!client) {
      logger?.error('OptimizelyProvider must be passed an Optimizely client instance');
      store.setError(new Error('Optimizely client is required'));
      return;
    }

    let isMounted = true;

    const waitForClientReady = async (): Promise<void> => {
      try {
        await client.onReady({ timeout });

        if (!isMounted) return;

        store.setClientReady(true);
      } catch (error) {
        if (!isMounted) return;
        const err = error instanceof Error ? error : new Error(String(error));
        store.setClientReady(false);
        store.setError(err);
      }
    };

    waitForClientReady();

    return () => {
      isMounted = false;
    };
  }, [client, timeout, store]);

  // Handle user changes
  useEffect(() => {
    // TODO: UserContextManager implementation
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      store.reset();
    };
  }, [store]);

  return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
}
