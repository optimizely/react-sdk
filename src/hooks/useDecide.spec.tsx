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
import React, { useRef } from 'react';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { OptimizelyContext, ProviderStateStore } from '../provider/index';
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
    setForcedDecision: vi.fn(),
    getForcedDecision: vi.fn(),
    removeForcedDecision: vi.fn(),
    removeAllForcedDecisions: vi.fn(),
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

function createWrapper(store: ProviderStateStore, client: Client) {
  const contextValue: OptimizelyContextValue = { store, client };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
  };
}

function useRenderCount() {
  const renderCount = useRef(0);
  return ++renderCount.current;
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
    expect(result.current.decision.enabled).toBe(false);
    expect(result.current.decision.variationKey).toBeNull();
    expect(result.current.decision.flagKey).toBe('flag_1');
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

  it('should return default decision while loading', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('my_flag'), { wrapper });

    const { decision } = result.current;
    expect(decision.enabled).toBe(false);
    expect(decision.variationKey).toBeNull();
    expect(decision.ruleKey).toBeNull();
    expect(decision.variables).toEqual({});
    expect(decision.flagKey).toBe('my_flag');
    expect(decision.reasons).toContain('Optimizely SDK not configured properly yet.');
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

  it('should re-evaluate when store state changes (user context set after mount)', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const mockUserContext = createMockUserContext();
    act(() => {
      store.setUserContext(mockUserContext);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision).toBe(MOCK_DECISION);
  });

  it('should re-evaluate when setClientReady fire', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);
    // Client has no config yet
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    // Simulate config becoming available when onReady resolves
    (mockClient.getOptimizelyConfig as ReturnType<typeof vi.fn>).mockReturnValue({ revision: '1' });
    act(() => {
      store.setClientReady(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision).toBe(MOCK_DECISION);
  });

  it('should return error from store with isLoading: false', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    act(() => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decision.enabled).toBe(false);
    expect(result.current.decision.variationKey).toBeNull();
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

  it('should update default decision flagKey when flagKey changes', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ flagKey }) => useDecide(flagKey), {
      wrapper,
      initialProps: { flagKey: 'flag_a' },
    });

    expect(result.current.decision.flagKey).toBe('flag_a');

    rerender({ flagKey: 'flag_b' });

    expect(result.current.decision.flagKey).toBe('flag_b');
  });

  it('should re-call decide() when setClientReady fires after sync decision was already served', () => {
    // Sync datafile scenario: config + userContext available before onReady
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_1'), { wrapper });

    // Decision already served
    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision).toBe(MOCK_DECISION);
    expect(mockUserContext.decide).toHaveBeenCalledTimes(1);

    // onReady() resolves → setClientReady(true) fires → store state changes →
    // useSyncExternalStore re-renders → useMemo recomputes → decide() called again.
    // This is a redundant call since config + userContext haven't changed,
    // but it's a one-time cost per flag per page load.
    act(() => {
      store.setClientReady(true);
    });

    expect(mockUserContext.decide).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision).toBe(MOCK_DECISION);
  });
});
