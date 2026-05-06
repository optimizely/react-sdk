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
import { NOTIFICATION_TYPES } from '@optimizely/optimizely-sdk';

import { ProviderStateStore } from './ProviderStateStore';
import { UserContextManager } from '../utils/UserContextManager';
import type { OptimizelyProviderProps, OptimizelyContextValue } from './types';
import type { Client } from '@optimizely/optimizely-sdk';

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
  const userManagerRef = useRef<UserContextManager | null>(null);
  const prevClientRef = useRef<Client>();
  const hadConfigAtRender = useMemo(() => !!client?.getOptimizelyConfig(), [client]);

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

  if (client) {
    // Create UserContextManager if not exists or if client has changed
    if (userManagerRef.current === null || prevClientRef.current !== client) {
      userManagerRef.current?.dispose();

      userManagerRef.current = new UserContextManager({
        client,
        onUserContextReady: (ctx) => store.setUserContext(ctx),
        onError: (error) => store.setError(error),
      });

      prevClientRef.current = client;
    }

    // UCM internally checks for user/segments/skipSegments changes
    userManagerRef.current.resolveUserContext(user, qualifiedSegments, skipSegments);
  }

  // Effect: Client readiness + config update subscription.
  // Handles both initial datafile fetch and subsequent polling updates.
  useEffect(() => {
    if (!client) {
      console.error('[OPTIMIZELY - REACT] OptimizelyProvider must be passed an Optimizely client instance');
      store.setError(new Error('Optimizely client is required'));
      return;
    }

    let isMounted = true;
    // When the datafile response is cached (e.g. browser HTTP cache),
    // CONFIG_UPDATE may fire before this effect subscribes. In that case
    // onReady resolves but CONFIG_UPDATE is never re-emitted (config
    // didn't change). The flag lets onReady act as a fallback without
    // causing a double-refresh when both fire.
    let configReceived = false;

    const listenerId = client.notificationCenter.addNotificationListener(
      NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
      () => {
        configReceived = true;
        store.refresh();
      }
    );

    client
      .onReady({ timeout })
      .then(() => {
        if (!isMounted || configReceived || hadConfigAtRender) return;
        store.refresh();
      })
      .catch((error) => {
        if (!isMounted) return;
        const err = error instanceof Error ? error : new Error(String(error));
        store.setError(err);
      });

    return () => {
      isMounted = false;
      client.notificationCenter.removeNotificationListener(listenerId);
    };
  }, [client, timeout, store, hadConfigAtRender]);

  return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
}
