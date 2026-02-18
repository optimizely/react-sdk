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
import { UserContextManager } from '../utils/UserContextManager';
import { areUsersEqual, areSegmentsEqual } from '../utils/helpers';
import type { OptimizelyProviderProps, OptimizelyContextValue, UserInfo } from './types';

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
  qualifiedSegments,
  children,
}: OptimizelyProviderProps): React.ReactElement {
  const storeRef = useRef<ProviderStateStore | null>(null);
  const managerRef = useRef<UserContextManager | null>(null);
  const prevUserRef = useRef<UserInfo | undefined>(undefined);
  const prevSegmentsRef = useRef<string[] | undefined>(undefined);

  if (storeRef.current === null) {
    storeRef.current = new ProviderStateStore();
  }

  const store = storeRef.current;

  const contextValue = useMemo<OptimizelyContextValue>(
    () => ({
      store,
      client,
    }),
    [client, store]
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
        store.setState({
          isClientReady: false,
          error: err,
        });
      }
    };

    waitForClientReady();

    return () => {
      isMounted = false;
    };
  }, [client, timeout, store]);

  // Effect 2: Manager lifecycle (create/dispose when client/skipSegments changes)
  // Does NOT trigger createUserContext — only manages the manager instance
  useEffect(() => {
    if (!client) return;

    managerRef.current?.dispose();
    managerRef.current = new UserContextManager({
      client,
      skipSegments,
      onUserContextReady: (ctx) => store.setUserContext(ctx),
      onError: (error) => store.setError(error),
    });

    // Reset prevUser/segments so Effect 3 treats current user as new
    prevUserRef.current = undefined;
    prevSegmentsRef.current = undefined;

    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, [client, skipSegments, store]);

  // Effect 3: User/segments prop changes — sole trigger for createUserContext
  // Runs on mount (prevUser is undefined) and on user/qualifiedSegments prop changes.
  // Also re-runs when client/skipSegments change (because Effect 2 resets
  // prevUserRef/prevSegmentsRef to undefined, and these deps are shared).
  useEffect(() => {
    if (!managerRef.current) return;

    const prevUser = prevUserRef.current;
    const prevSegments = prevSegmentsRef.current;
    const userChanged = prevUser === undefined || !areUsersEqual(prevUser, user);
    const segmentsChanged = !areSegmentsEqual(prevSegments, qualifiedSegments);

    if (!userChanged && !segmentsChanged) return;

    prevUserRef.current = user;
    prevSegmentsRef.current = qualifiedSegments;
    managerRef.current.createUserContext(user, qualifiedSegments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.attributes, qualifiedSegments, client, skipSegments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      store.reset();
    };
  }, [store]);

  return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
}
