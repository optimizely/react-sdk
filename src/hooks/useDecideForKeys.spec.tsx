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
import { useDecideForKeys } from './useDecideForKeys';
import {
  MOCK_DECISIONS,
  createMockUserContext,
  createMockClient,
  createProviderWrapper,
  createWrapper,
} from './testUtils';
import type { OptimizelyDecision, Client, OptimizelyDecideOption } from '@optimizely/optimizely-sdk';

describe('useDecideForKeys', () => {
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
      renderHook(() => useDecideForKeys(['flag_1']));
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true when no config and no user context', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.decisions).toEqual({});
  });

  it('should return isLoading: true when config is available but no user context', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return isLoading: true when user context is set but no config', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return empty decisions while loading', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.decisions).toEqual({});
    expect(result.current.isLoading).toBe(true);
  });

  it('should return decisions when config and user context are available', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
    expect(mockUserContext.decideForKeys).toHaveBeenCalledWith(['flag_1', 'flag_2'], undefined);
  });

  it('should pass decideOptions to userContext.decideForKeys()', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const decideOptions = ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[];

    const wrapper = createWrapper(store, mockClient);
    renderHook(() => useDecideForKeys(['flag_1'], { decideOptions }), { wrapper });

    expect(mockUserContext.decideForKeys).toHaveBeenCalledWith(['flag_1'], decideOptions);
  });

  it('should return error from store with isLoading: false', async () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decisions).toEqual({});
  });

  it('should not call decideForKeys() while loading', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    expect(mockUserContext.decideForKeys).not.toHaveBeenCalled();
  });

  it('should re-evaluate when store state changes (user context set after mount)', async () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_1', 'flag_2']), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const mockUserContext = createMockUserContext();
    await act(async () => {
      store.setUserContext(mockUserContext);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
  });

  it('should re-evaluate when keys array changes', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(({ keys }) => useDecideForKeys(keys), {
      wrapper,
      initialProps: { keys: ['flag_1'] },
    });

    expect(result.current.decisions).toEqual({ flag_1: MOCK_DECISIONS['flag_1'] });

    rerender({ keys: ['flag_1', 'flag_2'] });

    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
    expect(mockUserContext.decideForKeys).toHaveBeenCalledWith(['flag_1', 'flag_2'], undefined);
  });

  it('should return stable reference when nothing changes', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should handle decideOptions referential stability via useStableArray', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);

    const { result, rerender } = renderHook(
      () =>
        useDecideForKeys(['flag_1'], {
          decideOptions: ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[],
        }),
      { wrapper }
    );

    const firstResult = result.current;
    (mockUserContext.decideForKeys as ReturnType<typeof vi.fn>).mockClear();

    rerender();

    expect(mockUserContext.decideForKeys).not.toHaveBeenCalled();
    expect(result.current).toBe(firstResult);
  });

  it('should handle flagKeys referential stability via useStableArray', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);

    // Pass inline array (new reference each render) with same elements
    const { result, rerender } = renderHook(({ keys }) => useDecideForKeys(keys), {
      wrapper,
      initialProps: { keys: ['flag_1', 'flag_2'] },
    });

    const firstResult = result.current;
    (mockUserContext.decideForKeys as ReturnType<typeof vi.fn>).mockClear();

    // Rerender with same values but new array reference
    rerender({ keys: ['flag_1', 'flag_2'] });

    expect(mockUserContext.decideForKeys).not.toHaveBeenCalled();
    expect(result.current).toBe(firstResult);
  });

  it('should unsubscribe from store on unmount', () => {
    const unsubscribeSpy = vi.fn();
    const subscribeSpy = vi.spyOn(store, 'subscribe').mockReturnValue(unsubscribeSpy);

    const wrapper = createWrapper(store, mockClient);
    const { unmount } = renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('should re-evaluate decision when OPTIMIZELY_CONFIG_UPDATE fires from the client', async () => {
    const mockUserContext = createMockUserContext();
    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);

    const { result } = renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual({ flag_1: MOCK_DECISIONS['flag_1'] });

    const callCountBeforeUpdate = (mockUserContext.decideForKeys as ReturnType<typeof vi.fn>).mock.calls.length;

    const updatedDecisions: Record<string, OptimizelyDecision> = {
      flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'updated_variation' },
    };
    (mockUserContext.decideForKeys as ReturnType<typeof vi.fn>).mockReturnValue(updatedDecisions);

    await act(async () => {
      fireConfigUpdate();
    });

    expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(callCountBeforeUpdate + 1);
    expect(result.current.decisions).toEqual(updatedDecisions);
  });

  describe('forced decision reactivity', () => {
    it('should re-evaluate when setForcedDecision is called for a key in the array', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideForKeys(['flag_1', 'flag_2']), { wrapper });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(1);

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'forced_variation' });
      });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(2);
    });

    it('should NOT re-evaluate when setForcedDecision is called for a key NOT in the array', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(1);
      (mockUserContext.decideForKeys as ReturnType<typeof vi.fn>).mockClear();

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_2' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideForKeys).not.toHaveBeenCalled();
    });

    it('should re-evaluate when removeForcedDecision is called for a key in the array', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(2);

      act(() => {
        mockUserContext.removeForcedDecision({ flagKey: 'flag_1' });
      });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(3);
    });

    it('should re-evaluate when removeAllForcedDecisions is called', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideForKeys(['flag_1']), { wrapper });

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(2);

      act(() => {
        mockUserContext.removeAllForcedDecisions();
      });

      expect(mockUserContext.decideForKeys).toHaveBeenCalledTimes(3);
    });

    it('should re-subscribe forced decisions when keys change', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const subscribeFdSpy = vi.spyOn(store, 'subscribeForcedDecision');

      const wrapper = createWrapper(store, mockClient);
      const { rerender } = renderHook(({ keys }) => useDecideForKeys(keys), {
        wrapper,
        initialProps: { keys: ['flag_1'] },
      });

      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_1', expect.any(Function));

      rerender({ keys: ['flag_2', 'flag_3'] });

      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_2', expect.any(Function));
      expect(subscribeFdSpy).toHaveBeenCalledWith('flag_3', expect.any(Function));
    });

    it('should unsubscribe forced decision listeners on unmount', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const unsubscribeSpy = vi.fn();
      vi.spyOn(store, 'subscribeForcedDecision').mockReturnValue(unsubscribeSpy);

      const wrapper = createWrapper(store, mockClient);
      const { unmount } = renderHook(() => useDecideForKeys(['flag_1', 'flag_2']), { wrapper });

      unmount();

      // One unsubscribe call per key
      expect(unsubscribeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
