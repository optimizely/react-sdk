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
import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ProviderStateStore } from '../provider/index';
import { useDecideAllAsync } from './useDecideAllAsync';
import {
  MOCK_DECISIONS,
  createMockUserContext,
  createMockClient,
  createProviderWrapper,
  createWrapper,
} from './testUtils';
import type { OptimizelyDecision, Client, OptimizelyDecideOption } from '@optimizely/optimizely-sdk';

describe('useDecideAllAsync', () => {
  let store: ProviderStateStore;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ProviderStateStore();
    mockClient = createMockClient();
  });

  // --- Store state tests ---

  it('should throw when used outside of OptimizelyProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDecideAllAsync());
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true when no config and no user context', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.decisions).toEqual({});
  });

  it('should return isLoading: true when config is available but no user context', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return error from store with isLoading: false', async () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decisions).toEqual({});
  });

  it('should return isLoading: true while async call is in-flight', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.decisions).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('should not trigger a redundant re-render when mounting with store already ready', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    store.setUserContext(mockUserContext);

    let renderCount = 0;
    const wrapper = createWrapper(store, mockClient);
    renderHook(
      () => {
        renderCount++;
        return useDecideAllAsync();
      },
      { wrapper }
    );

    expect(renderCount).toBe(1);
  });

  it('should return decisions when async call resolves', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
    expect(result.current.error).toBeNull();
  });

  it('should return error when decideAllAsync() rejects', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    const asyncError = new Error('CMAB request failed');
    (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mockRejectedValue(asyncError);
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(asyncError);
    expect(result.current.decisions).toEqual({});
  });

  it('should wrap non-Error rejection in Error object', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mockRejectedValue('string error');
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('string error');
    expect(result.current.decisions).toEqual({});
  });

  // --- Race condition tests ---

  it('should discard stale result when store state changes before resolve', async () => {
    mockClient = createMockClient(true);
    const mockUserContext1 = createMockUserContext();

    let resolveFirst: (d: Record<string, OptimizelyDecision>) => void;
    const firstPromise = new Promise<Record<string, OptimizelyDecision>>((resolve) => {
      resolveFirst = resolve;
    });

    (mockUserContext1.decideAllAsync as ReturnType<typeof vi.fn>).mockReturnValue(firstPromise);
    store.setUserContext(mockUserContext1);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    // New user context arrives — cancels first async call
    const updatedDecisions: Record<string, OptimizelyDecision> = {
      flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'updated' },
    };
    const mockUserContext2 = createMockUserContext();
    (mockUserContext2.decideAllAsync as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDecisions);

    await act(async () => {
      store.setUserContext(mockUserContext2);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decisions).toEqual(updatedDecisions);

    // Resolve the stale first promise — should be ignored
    await act(async () => {
      resolveFirst!(MOCK_DECISIONS);
    });

    expect(result.current.decisions).toEqual(updatedDecisions);
  });

  // --- Re-evaluation tests ---

  it('should re-fire async call when decideOptions change', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ options }) => useDecideAllAsync({ decideOptions: options }), {
      wrapper,
      initialProps: { options: undefined as OptimizelyDecideOption[] | undefined },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newOptions = ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[];
    (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mockClear();

    rerender({ options: newOptions });

    expect(mockUserContext.decideAllAsync).toHaveBeenCalledWith(newOptions);
  });

  it('should re-fire async call on config update', async () => {
    const mockUserContext = createMockUserContext();
    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);

    const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual(MOCK_DECISIONS);

    const callCountBeforeUpdate = (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mock.calls.length;

    const updatedDecisions: Record<string, OptimizelyDecision> = {
      flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'updated_variation' },
    };
    (mockUserContext.decideAllAsync as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDecisions);

    await act(async () => {
      fireConfigUpdate();
    });

    expect(result.current.decisions).toEqual(updatedDecisions);
    expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(callCountBeforeUpdate + 1);
    expect(result.current.isLoading).toBe(false);
  });

  // --- Forced decision tests ---

  describe('forced decision reactivity', () => {
    it('should re-fire on any setForcedDecision via subscribeAllForcedDecisions', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(1);

      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'forced_variation' });
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(2);

      // A different flag also triggers re-evaluation
      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_99' }, { variationKey: 'v99' });
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(3);
    });

    it('should re-fire on removeForcedDecision', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(2);

      await act(async () => {
        mockUserContext.removeForcedDecision({ flagKey: 'flag_1' });
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(3);
    });

    it('should re-fire on removeAllForcedDecisions', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideAllAsync(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(2);

      await act(async () => {
        mockUserContext.removeAllForcedDecisions();
      });

      expect(mockUserContext.decideAllAsync).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe subscribeAllForcedDecisions listener on unmount', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const unsubscribeAllFdSpy = vi.fn();
      const subscribeAllFdSpy = vi.spyOn(store, 'subscribeAllForcedDecisions').mockReturnValue(unsubscribeAllFdSpy);

      const wrapper = createWrapper(store, mockClient);
      const { unmount } = renderHook(() => useDecideAllAsync(), { wrapper });

      expect(subscribeAllFdSpy).toHaveBeenCalledTimes(1);

      unmount();

      expect(unsubscribeAllFdSpy).toHaveBeenCalledTimes(1);
    });
  });
});
