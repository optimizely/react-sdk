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

import { vi } from 'vitest';
import React from 'react';
import { OptimizelyContext, ProviderStateStore, OptimizelyProvider } from '../provider';
import { REACT_CLIENT_META } from '../client';
import type { OptimizelyUserContext, OptimizelyDecision, Client } from '@optimizely/optimizely-sdk';
import type { OptimizelyContextValue } from '../provider';

export const MOCK_DECISION: OptimizelyDecision = {
  variationKey: 'variation_1',
  enabled: true,
  variables: { color: 'red' },
  ruleKey: 'rule_1',
  flagKey: 'flag_1',
  userContext: {} as OptimizelyUserContext,
  reasons: [],
};

export const MOCK_DECISIONS: Record<string, OptimizelyDecision> = {
  flag_1: MOCK_DECISION,
  flag_2: {
    variationKey: 'variation_2',
    enabled: false,
    variables: { size: 'large' },
    ruleKey: 'rule_2',
    flagKey: 'flag_2',
    userContext: {} as OptimizelyUserContext,
    reasons: [],
  },
};

/**
 * Creates a mock OptimizelyUserContext with all methods stubbed.
 * Override specific methods via the overrides parameter.
 */
export function createMockUserContext(overrides?: Partial<Record<string, unknown>>): OptimizelyUserContext {
  return {
    getUserId: vi.fn().mockReturnValue('test-user'),
    getAttributes: vi.fn().mockReturnValue({}),
    fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
    decide: vi.fn().mockReturnValue(MOCK_DECISION),
    decideAll: vi.fn().mockReturnValue(MOCK_DECISIONS),
    decideForKeys: vi.fn().mockImplementation((keys: string[]) => {
      const result: Record<string, OptimizelyDecision> = {};
      for (const key of keys) {
        if (MOCK_DECISIONS[key]) {
          result[key] = MOCK_DECISIONS[key];
        }
      }
      return result;
    }),
    decideAsync: vi.fn().mockResolvedValue(MOCK_DECISION),
    decideAllAsync: vi.fn().mockResolvedValue(MOCK_DECISIONS),
    decideForKeysAsync: vi.fn().mockImplementation((keys: string[]) => {
      const result: Record<string, OptimizelyDecision> = {};
      for (const key of keys) {
        if (MOCK_DECISIONS[key]) {
          result[key] = MOCK_DECISIONS[key];
        }
      }
      return Promise.resolve(result);
    }),
    setForcedDecision: vi.fn().mockReturnValue(true),
    getForcedDecision: vi.fn(),
    removeForcedDecision: vi.fn().mockReturnValue(true),
    removeAllForcedDecisions: vi.fn().mockReturnValue(true),
    trackEvent: vi.fn(),
    getOptimizely: vi.fn(),
    setQualifiedSegments: vi.fn(),
    getQualifiedSegments: vi.fn().mockReturnValue([]),
    qualifiedSegments: null,
    ...overrides,
  } as unknown as OptimizelyUserContext;
}

/**
 * Creates a mock Optimizely Client.
 * @param hasConfig - If true, getOptimizelyConfig returns a config object; otherwise null.
 */
export function createMockClient(hasConfig = false): Client {
  return {
    getOptimizelyConfig: vi.fn().mockReturnValue(hasConfig ? { revision: '1' } : null),
    createUserContext: vi.fn(),
    onReady: vi.fn().mockResolvedValue({ success: true }),
    notificationCenter: {},
  } as unknown as Client;
}

/**
 * Creates a mock client with notification center support and wraps it in OptimizelyProvider.
 * Used for integration-style tests that need the full Provider lifecycle.
 */
export function createProviderWrapper(mockUserContext: OptimizelyUserContext) {
  let configUpdateCallback: (() => void) | undefined;

  const client = {
    getOptimizelyConfig: vi.fn().mockReturnValue({ revision: '1' }),
    createUserContext: vi.fn().mockReturnValue(mockUserContext),
    onReady: vi.fn().mockResolvedValue(undefined),
    isOdpIntegrated: vi.fn().mockReturnValue(false),
    notificationCenter: {
      addNotificationListener: vi.fn().mockImplementation((type: string, cb: () => void) => {
        if (type === 'OPTIMIZELY_CONFIG_UPDATE') {
          configUpdateCallback = cb;
        }
        return 1;
      }),
      removeNotificationListener: vi.fn(),
    },
  } as unknown as Client;

  (client as unknown as Record<symbol, unknown>)[REACT_CLIENT_META] = {
    hasOdpManager: false,
    hasVuidManager: false,
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <OptimizelyProvider client={client} user={{ id: 'user-1' }}>
        {children}
      </OptimizelyProvider>
    );
  }

  return {
    wrapper: Wrapper,
    client,
    fireConfigUpdate: () => configUpdateCallback?.(),
  };
}

/**
 * Creates a lightweight wrapper that provides OptimizelyContext directly
 * (bypassing Provider lifecycle). Used for unit tests.
 */
export function createWrapper(store: ProviderStateStore, client: Client) {
  const contextValue: OptimizelyContextValue = { store, client };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
  };
}
