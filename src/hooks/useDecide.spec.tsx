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

import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { OptimizelyContext, ProviderStateStore, OptimizelyProvider } from '../provider/index';
import { REACT_CLIENT_META } from '../client/index';
import { useDecide } from './useDecide';
import type {
  OptimizelyUserContext,
  OptimizelyDecision,
  Client,
  OptimizelyDecideOption,
} from '@optimizely/optimizely-sdk';
import type { OptimizelyContextValue } from '../provider/index';

const MOCK_DECISION: OptimizelyDecision = {
  variationKey: 'variation_1',
  enabled: true,
  variables: { color: 'red' },
  ruleKey: 'rule_1',
  flagKey: 'flag_1',
  userContext: {} as OptimizelyUserContext,
  reasons: [],
};

function createMockUserContext(overrides?: Partial<Record<'decide', unknown>>): OptimizelyUserContext {
  return {
    getUserId: vi.fn().mockReturnValue('test-user'),
    getAttributes: vi.fn().mockReturnValue({}),
    fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
    decide: vi.fn().mockReturnValue(MOCK_DECISION),
    decideAll: vi.fn(),
    decideForKeys: vi.fn(),
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

function createMockClient(hasConfig = false): Client {
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
function createProviderWrapper(mockUserContext: OptimizelyUserContext) {
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

function createWrapper(store: ProviderStateStore, client: Client) {
  const contextValue: OptimizelyContextValue = { store, client };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
  };
}

describe('useDecide', () => {
  let store: ProviderStateStore;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ProviderStateStore();
    mockClient = createMockClient();
  });

  it('should throw when used outside of OptimizelyProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDecide('flag_1'));
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true when no config and no user context', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.decision).toBeNull();
  });

  it('should return isLoading: true when config is available but no user context', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return isLoading: true when user context is set but no config', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return null decision while loading', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('my_flag'), { wrapper });

    expect(result.current.decision).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return actual decision when config and user context are available', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.decision).toBe(MOCK_DECISION);
    expect(mockUserContext.decide).toHaveBeenCalledWith('flag_1', undefined);
  });

  it('should pass decideOptions to userContext.decide()', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const decideOptions = ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[];

    const wrapper = createWrapper(store, mockClient);
    renderHook(() => useDecide('flag_1', { decideOptions }), { wrapper });

    expect(mockUserContext.decide).toHaveBeenCalledWith('flag_1', decideOptions);
  });

  it('should re-evaluate when store state changes (user context set after mount)', async () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const mockUserContext = createMockUserContext();
    await act(async () => {
      store.setUserContext(mockUserContext);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision).toBe(MOCK_DECISION);
  });

  it('should return error from store with isLoading: false', async () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decision).toBeNull();
  });

  it('should re-evaluate when flagKey changes', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();

    const decisionForFlag2: OptimizelyDecision = {
      ...MOCK_DECISION,
      flagKey: 'flag_2',
      variationKey: 'variation_2',
    };
    (mockUserContext.decide as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      return key === 'flag_2' ? decisionForFlag2 : MOCK_DECISION;
    });

    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ flagKey }) => useDecide(flagKey), {
      wrapper,
      initialProps: { flagKey: 'flag_1' },
    });

    expect(result.current.decision).toBe(MOCK_DECISION);

    rerender({ flagKey: 'flag_2' });

    expect(result.current.decision).toBe(decisionForFlag2);
    expect(mockUserContext.decide).toHaveBeenCalledWith('flag_2', undefined);
  });

  it('should return stable reference when nothing changes', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(() => useDecide('flag_1'), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should handle decideOptions referential stability via useStableArray', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);

    // Pass inline array (new reference each render) with same elements
    const { result, rerender } = renderHook(
      () => useDecide('flag_1', { decideOptions: ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[] }),
      { wrapper }
    );

    const firstResult = result.current;
    (mockUserContext.decide as ReturnType<typeof vi.fn>).mockClear();

    rerender();

    // Should NOT re-call decide() since the array elements are the same
    expect(mockUserContext.decide).not.toHaveBeenCalled();
    expect(result.current).toBe(firstResult);
  });

  it('should unsubscribe from store on unmount', () => {
    const unsubscribeSpy = vi.fn();
    const subscribeSpy = vi.spyOn(store, 'subscribe').mockReturnValue(unsubscribeSpy);

    const wrapper = createWrapper(store, mockClient);
    const { unmount } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('should not call decide() while loading', () => {
    const mockUserContext = createMockUserContext();
    // Config not available, user context set
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    renderHook(() => useDecide('flag_1'), { wrapper });

    // decide should not be called because config is not available
    expect(mockUserContext.decide).not.toHaveBeenCalled();
  });

  it('should return null decision for both flagKeys when loading', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ flagKey }) => useDecide(flagKey), {
      wrapper,
      initialProps: { flagKey: 'flag_a' },
    });

    expect(result.current.decision).toBeNull();

    rerender({ flagKey: 'flag_b' });

    expect(result.current.decision).toBeNull();
  });

  it('should re-evaluate decision when OPTIMIZELY_CONFIG_UPDATE fires from the client', async () => {
    const mockUserContext = createMockUserContext();
    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);

    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    // Wait for Provider's onReady + UserContextManager + queueMicrotask chain to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision).toBe(MOCK_DECISION);

    const callCountBeforeUpdate = (mockUserContext.decide as ReturnType<typeof vi.fn>).mock.calls.length;

    // Simulate a new datafile with a different decision
    const updatedDecision: OptimizelyDecision = {
      ...MOCK_DECISION,
      variationKey: 'variation_2',
      variables: { color: 'blue' },
    };
    (mockUserContext.decide as ReturnType<typeof vi.fn>).mockReturnValue(updatedDecision);

    // Fire the config update notification (as the SDK would on datafile poll)
    await act(async () => {
      fireConfigUpdate();
    });

    expect(mockUserContext.decide).toHaveBeenCalledTimes(callCountBeforeUpdate + 1);
    expect(result.current.decision).toBe(updatedDecision);
    expect(result.current.isLoading).toBe(false);
  });

  describe('forced decision reactivity', () => {
    it('should re-evaluate when setForcedDecision is called for the same flagKey', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

      expect(mockUserContext.decide).toHaveBeenCalledTimes(1);

      const forcedDecision: OptimizelyDecision = {
        ...MOCK_DECISION,
        variationKey: 'forced_variation',
      };
      (mockUserContext.decide as ReturnType<typeof vi.fn>).mockReturnValue(forcedDecision);

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'forced_variation' });
      });

      expect(mockUserContext.decide).toHaveBeenCalledTimes(2);
      expect(result.current.decision).toBe(forcedDecision);
    });

    it('should NOT re-evaluate when setForcedDecision is called for a different flagKey', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecide('flag_1'), { wrapper });

      expect(mockUserContext.decide).toHaveBeenCalledTimes(1);
      (mockUserContext.decide as ReturnType<typeof vi.fn>).mockClear();

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_2' }, { variationKey: 'v1' });
      });

      // flag_1 hook should NOT re-evaluate — different flagKey
      expect(mockUserContext.decide).not.toHaveBeenCalled();
    });

    it('should re-evaluate when removeForcedDecision is called for the same flagKey', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecide('flag_1'), { wrapper });

      // Set then remove
      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decide).toHaveBeenCalledTimes(2);

      act(() => {
        mockUserContext.removeForcedDecision({ flagKey: 'flag_1' });
      });

      expect(mockUserContext.decide).toHaveBeenCalledTimes(3);
    });

    it('should re-evaluate when removeAllForcedDecisions is called', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecide('flag_1'), { wrapper });

      // Set a forced decision to register the flagKey internally
      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });
      // (mockUserContext.decide as ReturnType<typeof vi.fn>).mockClear();
      expect(mockUserContext.decide).toHaveBeenCalledTimes(2);

      act(() => {
        mockUserContext.removeAllForcedDecisions();
      });

      expect(mockUserContext.decide).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe forced decision listener on unmount', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const unsubscribeFdSpy = vi.fn();
      const subscribeFdSpy = vi.spyOn(store, 'subscribeForcedDecision').mockReturnValue(unsubscribeFdSpy);

      const wrapper = createWrapper(store, mockClient);
      const { unmount } = renderHook(() => useDecide('flag_1'), { wrapper });

      expect(subscribeFdSpy).toHaveBeenCalledTimes(1);
      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_1', expect.any(Function));

      unmount();

      expect(unsubscribeFdSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-subscribe to forced decisions when flagKey changes', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const subscribeFdSpy = vi.spyOn(store, 'subscribeForcedDecision');

      const wrapper = createWrapper(store, mockClient);
      const { rerender } = renderHook(({ flagKey }) => useDecide(flagKey), {
        wrapper,
        initialProps: { flagKey: 'flag_1' },
      });

      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_1', expect.any(Function));

      rerender({ flagKey: 'flag_2' });

      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_2', expect.any(Function));
    });
  });
});
