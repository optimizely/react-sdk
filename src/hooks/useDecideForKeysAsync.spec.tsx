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
import { useDecideForKeysAsync } from './useDecideForKeysAsync';
import {
  MOCK_DECISIONS,
  createMockUserContext,
  createMockClient,
  createProviderWrapper,
  createWrapper,
} from './testUtils';
import type { OptimizelyDecision, Client, OptimizelyDecideOption } from '@optimizely/optimizely-sdk';

describe('useDecideForKeysAsync', () => {
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
      renderHook(() => useDecideForKeysAsync(['flag_1']));
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true when no config and no user context', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.decisions).toEqual({});
  });

  it('should return isLoading: true when config is available but no user context', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return error from store with isLoading: false', async () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

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
    (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.decisions).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('should return decisions when async call resolves', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1', 'flag_2']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
    expect(result.current.error).toBeNull();
  });

  it('should return error when decideForKeysAsync() rejects', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    const asyncError = new Error('CMAB request failed');
    (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockRejectedValue(asyncError);
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(asyncError);
    expect(result.current.decisions).toEqual({});
  });

  it('should wrap non-Error rejection in Error object', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockRejectedValue('string error');
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('string error');
    expect(result.current.decisions).toEqual({});
  });

  // --- Race condition tests ---

  it('should discard stale result when flagKeys change before resolve', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();

    let resolveFirst: (d: Record<string, OptimizelyDecision>) => void;
    const firstPromise = new Promise<Record<string, OptimizelyDecision>>((resolve) => {
      resolveFirst = resolve;
    });

    const flag2Only: Record<string, OptimizelyDecision> = {
      flag_2: MOCK_DECISIONS['flag_2'],
    };

    (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(flag2Only);

    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ keys }) => useDecideForKeysAsync(keys), {
      wrapper,
      initialProps: { keys: ['flag_1'] },
    });

    // Change keys before first resolves
    rerender({ keys: ['flag_2'] });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual(flag2Only);

    // Now resolve the stale first promise — should be ignored
    await act(async () => {
      resolveFirst!({ flag_1: MOCK_DECISIONS['flag_1'] });
    });

    expect(result.current.decisions).toEqual(flag2Only);
  });

  it('should discard stale result when store state changes before resolve', async () => {
    mockClient = createMockClient(true);
    const mockUserContext1 = createMockUserContext();

    let resolveFirst: (d: Record<string, OptimizelyDecision>) => void;
    const firstPromise = new Promise<Record<string, OptimizelyDecision>>((resolve) => {
      resolveFirst = resolve;
    });

    (mockUserContext1.decideForKeysAsync as ReturnType<typeof vi.fn>).mockReturnValue(firstPromise);
    store.setUserContext(mockUserContext1);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.isLoading).toBe(true);

    // New user context arrives — cancels first async call
    const updatedDecisions: Record<string, OptimizelyDecision> = {
      flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'updated' },
      flag_2: MOCK_DECISIONS['flag_2'],
    };
    const mockUserContext2 = createMockUserContext();
    (mockUserContext2.decideForKeysAsync as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDecisions);

    await act(async () => {
      store.setUserContext(mockUserContext2);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

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
    const { result, rerender } = renderHook(
      ({ options }) => useDecideForKeysAsync(['flag_1'], { decideOptions: options }),
      {
        wrapper,
        initialProps: { options: undefined as OptimizelyDecideOption[] | undefined },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newOptions = ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[];
    (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockClear();

    rerender({ options: newOptions });

    expect(mockUserContext.decideForKeysAsync).toHaveBeenCalledWith(['flag_1'], newOptions);
  });

  it('should re-fire async call on config update', async () => {
    const mockUserContext = createMockUserContext();
    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);

    const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual({ flag_1: MOCK_DECISIONS['flag_1'] });

    const callCountBeforeUpdate = (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mock.calls.length;

    const updatedDecisions: Record<string, OptimizelyDecision> = {
      flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'updated_variation' },
    };
    (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDecisions);

    await act(async () => {
      fireConfigUpdate();
    });

    expect(result.current.decisions).toEqual(updatedDecisions);
    expect(mockUserContext.decideForKeysAsync).toHaveBeenCalledTimes(callCountBeforeUpdate + 1);
    expect(result.current.isLoading).toBe(false);
  });

  // --- Forced decision tests ---

  describe('forced decision reactivity', () => {
    it('should re-fire async call when setForcedDecision is called for a key in the array', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideForKeysAsync(['flag_1', 'flag_2']), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUserContext.decideForKeysAsync).toHaveBeenCalledTimes(1);

      const forcedDecisions: Record<string, OptimizelyDecision> = {
        flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'forced_variation' },
        flag_2: MOCK_DECISIONS['flag_2'],
      };
      (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockResolvedValue(forcedDecisions);

      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'forced_variation' });
      });

      expect(mockUserContext.decideForKeysAsync).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(result.current.decisions).toEqual(forcedDecisions);
      });
    });

    it('should NOT re-fire for a flagKey NOT in the array', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (mockUserContext.decideForKeysAsync as ReturnType<typeof vi.fn>).mockClear();

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_2' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideForKeysAsync).not.toHaveBeenCalled();
    });

    it('should re-fire when removeAllForcedDecisions is called', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideForKeysAsync(['flag_1']), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set a forced decision to register the flagKey
      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideForKeysAsync).toHaveBeenCalledTimes(2);

      await act(async () => {
        mockUserContext.removeAllForcedDecisions();
      });

      expect(mockUserContext.decideForKeysAsync).toHaveBeenCalledTimes(3);
    });

    it('should re-subscribe forced decisions when keys change', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const subscribeFdSpy = vi.spyOn(store, 'subscribeForcedDecision');

      const wrapper = createWrapper(store, mockClient);
      const { rerender } = renderHook(({ keys }) => useDecideForKeysAsync(keys), {
        wrapper,
        initialProps: { keys: ['flag_1'] },
      });

      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_1', expect.any(Function));

      rerender({ keys: ['flag_2', 'flag_3'] });

      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_2', expect.any(Function));
      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_3', expect.any(Function));
    });

    it('should unsubscribe forced decision listeners on unmount', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const unsubscribeSpy = vi.fn();
      vi.spyOn(store, 'subscribeForcedDecision').mockReturnValue(unsubscribeSpy);

      const wrapper = createWrapper(store, mockClient);
      const { unmount } = renderHook(() => useDecideForKeysAsync(['flag_1', 'flag_2']), { wrapper });

      unmount();

      // One unsubscribe call per key
      expect(unsubscribeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
