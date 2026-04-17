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
import { useDecideAsync } from './useDecideAsync';
import {
  MOCK_DECISION,
  createMockUserContext,
  createMockClient,
  createProviderWrapper,
  createWrapper,
} from './testUtils';
import type { OptimizelyDecision, Client, OptimizelyDecideOption } from '@optimizely/optimizely-sdk';

describe('useDecideAsync', () => {
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
      renderHook(() => useDecideAsync('flag_1'));
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true when no config and no user context', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.decision).toBeNull();
  });

  it('should return isLoading: true when config is available but no user context', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return error from store with isLoading: false when no decision is possible', async () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decision).toBeNull();
  });

  it('should return stale decision alongside error when config and user context are available', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision).toBe(MOCK_DECISION);
    expect(result.current.error).toBeNull();

    const testError = new Error('CDN datafile fetch failed');
    await act(async () => {
      store.setError(testError);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.decision).toBe(MOCK_DECISION);
  });

  it('should return isLoading: true while async call is in-flight', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    // Make decideAsync never resolve
    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.decision).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should not trigger a redundant re-render when mounting with store already ready', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    store.setUserContext(mockUserContext);

    let renderCount = 0;
    const wrapper = createWrapper(store, mockClient);
    renderHook(
      () => {
        renderCount++;
        return useDecideAsync('flag_1');
      },
      { wrapper }
    );

    // Should render once (initial), not twice (initial + redundant setState)
    expect(renderCount).toBe(1);
  });

  it('should return decision when async call resolves', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision).toBe(MOCK_DECISION);
    expect(result.current.error).toBeNull();
  });

  it('should return error when decideAsync() rejects', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    const asyncError = new Error('CMAB request failed');
    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockRejectedValue(asyncError);
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(asyncError);
    expect(result.current.decision).toBeNull();
  });

  it('should wrap non-Error rejection in Error object', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockRejectedValue('string error');
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('string error');
    expect(result.current.decision).toBeNull();
  });

  // --- Race condition tests ---

  it('should discard stale result when flagKey changes before resolve', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();

    let resolveFirst: (d: OptimizelyDecision) => void;
    const firstPromise = new Promise<OptimizelyDecision>((resolve) => {
      resolveFirst = resolve;
    });

    const decisionForFlag2: OptimizelyDecision = {
      ...MOCK_DECISION,
      flagKey: 'flag_2',
      variationKey: 'variation_2',
    };

    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(decisionForFlag2);

    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ flagKey }) => useDecideAsync(flagKey), {
      wrapper,
      initialProps: { flagKey: 'flag_1' },
    });

    // Change flagKey before first resolves
    rerender({ flagKey: 'flag_2' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision).toBe(decisionForFlag2);

    // Now resolve the stale first promise — should be ignored
    await act(async () => {
      resolveFirst!(MOCK_DECISION);
    });

    // Should still show flag_2's decision
    expect(result.current.decision).toBe(decisionForFlag2);
  });

  it('should discard stale result when store state changes before resolve', async () => {
    mockClient = createMockClient(true);
    const mockUserContext1 = createMockUserContext();

    let resolveFirst: (d: OptimizelyDecision) => void;
    const firstPromise = new Promise<OptimizelyDecision>((resolve) => {
      resolveFirst = resolve;
    });

    (mockUserContext1.decideAsync as ReturnType<typeof vi.fn>).mockReturnValue(firstPromise);
    store.setUserContext(mockUserContext1);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    // New user context arrives — cancels first async call
    const updatedDecision: OptimizelyDecision = { ...MOCK_DECISION, variationKey: 'updated' };
    const mockUserContext2 = createMockUserContext();
    (mockUserContext2.decideAsync as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDecision);

    await act(async () => {
      store.setUserContext(mockUserContext2);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision).toBe(updatedDecision);

    // Resolve the stale first promise — should be ignored
    await act(async () => {
      resolveFirst!(MOCK_DECISION);
    });

    expect(result.current.decision).toBe(updatedDecision);
  });

  // --- Re-evaluation tests ---

  it('should re-fire async call when decideOptions change', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ options }) => useDecideAsync('flag_1', { decideOptions: options }), {
      wrapper,
      initialProps: { options: undefined as OptimizelyDecideOption[] | undefined },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newOptions = ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[];
    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockClear();

    rerender({ options: newOptions });

    expect(mockUserContext.decideAsync).toHaveBeenCalledWith('flag_1', newOptions);
  });

  it('should re-fire async call on config update', async () => {
    const mockUserContext = createMockUserContext();
    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);

    const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision).toBe(MOCK_DECISION);

    const callCountBeforeUpdate = (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mock.calls.length;

    const updatedDecision: OptimizelyDecision = {
      ...MOCK_DECISION,
      variationKey: 'variation_2',
      variables: { color: 'blue' },
    };
    (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDecision);

    await act(async () => {
      fireConfigUpdate();
    });

    expect(result.current.decision).toBe(updatedDecision);
    expect(mockUserContext.decideAsync).toHaveBeenCalledTimes(callCountBeforeUpdate + 1);
    expect(result.current.isLoading).toBe(false);
  });

  // --- Forced decision tests ---

  describe('forced decision reactivity', () => {
    it('should re-fire async call when setForcedDecision is called for the same flagKey', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockUserContext.decideAsync).toHaveBeenCalledTimes(1);

      const forcedDecision: OptimizelyDecision = {
        ...MOCK_DECISION,
        variationKey: 'forced_variation',
      };
      (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockResolvedValue(forcedDecision);

      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'forced_variation' });
      });

      expect(mockUserContext.decideAsync).toHaveBeenCalledTimes(2);
      expect(result.current.decision).toBe(forcedDecision);
    });

    it('should NOT re-fire for a different flagKey forced decision', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (mockUserContext.decideAsync as ReturnType<typeof vi.fn>).mockClear();

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_2' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideAsync).not.toHaveBeenCalled();
    });

    it('should re-fire when removeAllForcedDecisions is called', async () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      const { result } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set a forced decision to register the flagKey
      await act(async () => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideAsync).toHaveBeenCalledTimes(2);

      await act(async () => {
        mockUserContext.removeAllForcedDecisions();
      });

      expect(mockUserContext.decideAsync).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe forced decision listener on unmount', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const unsubscribeFdSpy = vi.fn();
      const subscribeFdSpy = vi.spyOn(store, 'subscribeForcedDecision').mockReturnValue(unsubscribeFdSpy);

      const wrapper = createWrapper(store, mockClient);
      const { unmount } = renderHook(() => useDecideAsync('flag_1'), { wrapper });

      expect(subscribeFdSpy).toHaveBeenCalledTimes(1);
      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_1', expect.any(Function));

      unmount();

      expect(unsubscribeFdSpy).toHaveBeenCalledTimes(1);
    });
  });
});
