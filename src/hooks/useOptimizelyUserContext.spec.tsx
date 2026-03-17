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
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { OptimizelyContext } from '../provider/OptimizelyProvider';
import { ProviderStateStore } from '../provider/ProviderStateStore';
import { useOptimizelyUserContext } from './useOptimizelyUserContext';
import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';
import type { OptimizelyContextValue } from '../provider/types';

function useRenderCount() {
  const renderCount = useRef(0);
  return ++renderCount.current;
}

function createMockUserContext(userId = 'test-user'): OptimizelyUserContext {
  return {
    getUserId: vi.fn().mockReturnValue(userId),
    getAttributes: vi.fn().mockReturnValue({}),
    fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
    decide: vi.fn(),
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
  } as unknown as OptimizelyUserContext;
}

function createWrapper(store: ProviderStateStore) {
  const contextValue: OptimizelyContextValue = {
    store,
    client: {} as OptimizelyContextValue['client'],
  };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <OptimizelyContext.Provider value={contextValue}>{children}</OptimizelyContext.Provider>;
  };
}

describe('useOptimizelyUserContext', () => {
  let store: ProviderStateStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ProviderStateStore();
  });

  it('should throw when used outside of OptimizelyProvider', () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useOptimizelyUserContext());
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true with null userContext when no user context is set', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.userContext).toBeNull();
  });

  it('should return the current user context with isLoading: false', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.userContext).toBe(mockUserContext);
  });

  it('should update when user context changes', async () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.userContext).toBeNull();

    const mockUserContext = createMockUserContext('user-1');
    await act(async () => {
      store.setUserContext(mockUserContext);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.userContext).toBe(mockUserContext);
  });

  it('should update when user context changes to a different user', async () => {
    const userContext1 = createMockUserContext('user-1');
    store.setUserContext(userContext1);

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(result.current.userContext).toBe(userContext1);

    const userContext2 = createMockUserContext('user-2');
    await act(async () => {
      store.setUserContext(userContext2);
    });

    expect(result.current.userContext).toBe(userContext2);
  });

  it('should return isLoading: true when store is reset', async () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(result.current.userContext).toBe(mockUserContext);

    await act(async () => {
      store.reset();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.userContext).toBeNull();
  });

  it('should return error with isLoading: false when store has error', async () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.userContext).toBeNull();
  });

  it('should unsubscribe from store on unmount', () => {
    const unsubscribeSpy = vi.fn();
    const subscribeSpy = vi.spyOn(store, 'subscribe').mockReturnValue(unsubscribeSpy);

    const wrapper = createWrapper(store);
    const { unmount } = renderHook(() => useOptimizelyUserContext(), { wrapper });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('should not re-render when unrelated state changes occur', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    let capturedRenderCount = 0;
    function TestComponent() {
      const { userContext } = useOptimizelyUserContext();
      const renderCount = useRenderCount();
      capturedRenderCount = renderCount;
      return <div data-testid="user-id">{userContext?.getUserId()}</div>;
    }

    const contextValue: OptimizelyContextValue = {
      store,
      client: {} as OptimizelyContextValue['client'],
    };

    render(
      <OptimizelyContext.Provider value={contextValue}>
        <TestComponent />
      </OptimizelyContext.Provider>
    );

    const initialRenderCount = capturedRenderCount;

    // Triggering a store notification via setState,
    // but since the derived result hasn't changed, useMemo returns
    // the same reference and React bails out
    act(() => {
      store.refresh();
    });

    expect(capturedRenderCount).toBe(initialRenderCount);
    expect(screen.getByTestId('user-id').textContent).toBe('test-user');
  });
});
