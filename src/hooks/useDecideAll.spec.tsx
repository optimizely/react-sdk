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
import { useDecideAll } from './useDecideAll';
import {
  MOCK_DECISIONS,
  createMockUserContext,
  createMockClient,
  createProviderWrapper,
  createWrapper,
} from './testUtils';
import type { OptimizelyDecision, Client, OptimizelyDecideOption } from '@optimizely/optimizely-sdk';

describe('useDecideAll', () => {
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
      renderHook(() => useDecideAll());
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return isLoading: true when no config and no user context', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.decisions).toEqual({});
  });

  it('should return isLoading: true when config is available but no user context', () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return isLoading: true when user context is set but no config', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return empty decisions while loading', () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.decisions).toEqual({});
    expect(result.current.isLoading).toBe(true);
  });

  it('should return decisions when config and user context are available', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
    expect(mockUserContext.decideAll).toHaveBeenCalledWith(undefined);
  });

  it('should pass decideOptions to userContext.decideAll()', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const decideOptions = ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[];

    const wrapper = createWrapper(store, mockClient);
    renderHook(() => useDecideAll({ decideOptions }), { wrapper });

    expect(mockUserContext.decideAll).toHaveBeenCalledWith(decideOptions);
  });

  it('should return error from store with isLoading: false when no decision is possible', async () => {
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const testError = new Error('SDK initialization failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decisions).toEqual({});
  });

  it('should return stale decisions alongside error when config and user context are available', async () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
    expect(result.current.error).toBeNull();

    const testError = new Error('CDN datafile fetch failed');
    await act(async () => {
      store.setError(testError);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(testError);
    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
  });

  it('should not call decideAll() while loading', () => {
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    renderHook(() => useDecideAll(), { wrapper });

    expect(mockUserContext.decideAll).not.toHaveBeenCalled();
  });

  it('should re-evaluate when store state changes (user context set after mount)', async () => {
    mockClient = createMockClient(true);
    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    const mockUserContext = createMockUserContext();
    await act(async () => {
      store.setUserContext(mockUserContext);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decisions).toEqual(MOCK_DECISIONS);
  });

  it('should return stable reference when nothing changes', () => {
    mockClient = createMockClient(true);
    const mockUserContext = createMockUserContext();
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result, rerender } = renderHook(() => useDecideAll(), { wrapper });

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
        useDecideAll({
          decideOptions: ['DISABLE_DECISION_EVENT'] as unknown as OptimizelyDecideOption[],
        }),
      { wrapper }
    );

    const firstResult = result.current;
    (mockUserContext.decideAll as ReturnType<typeof vi.fn>).mockClear();

    rerender();

    expect(mockUserContext.decideAll).not.toHaveBeenCalled();
    expect(result.current).toBe(firstResult);
  });

  it('should unsubscribe from store on unmount', () => {
    const unsubscribeSpy = vi.fn();
    const subscribeSpy = vi.spyOn(store, 'subscribe').mockReturnValue(unsubscribeSpy);

    const wrapper = createWrapper(store, mockClient);
    const { unmount } = renderHook(() => useDecideAll(), { wrapper });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('should re-evaluate decision when OPTIMIZELY_CONFIG_UPDATE fires from the client', async () => {
    const mockUserContext = createMockUserContext();
    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);

    const { result } = renderHook(() => useDecideAll(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decisions).toEqual(MOCK_DECISIONS);

    const callCountBeforeUpdate = (mockUserContext.decideAll as ReturnType<typeof vi.fn>).mock.calls.length;

    const updatedDecisions: Record<string, OptimizelyDecision> = {
      flag_1: { ...MOCK_DECISIONS['flag_1'], variationKey: 'updated_variation' },
    };
    (mockUserContext.decideAll as ReturnType<typeof vi.fn>).mockReturnValue(updatedDecisions);

    await act(async () => {
      fireConfigUpdate();
    });

    expect(mockUserContext.decideAll).toHaveBeenCalledTimes(callCountBeforeUpdate + 1);
    expect(result.current.decisions).toEqual(updatedDecisions);
  });

  describe('forced decision reactivity', () => {
    it('should re-evaluate on any setForcedDecision via subscribeAllForcedDecisions', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideAll(), { wrapper });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(1);

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'forced_variation' });
      });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(2);

      // A different flag also triggers re-evaluation
      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_99' }, { variationKey: 'v99' });
      });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(3);
    });

    it('should re-evaluate on removeForcedDecision', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideAll(), { wrapper });

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(2);

      act(() => {
        mockUserContext.removeForcedDecision({ flagKey: 'flag_1' });
      });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(3);
    });

    it('should re-evaluate on removeAllForcedDecisions', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const wrapper = createWrapper(store, mockClient);
      renderHook(() => useDecideAll(), { wrapper });

      act(() => {
        mockUserContext.setForcedDecision({ flagKey: 'flag_1' }, { variationKey: 'v1' });
      });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(2);

      act(() => {
        mockUserContext.removeAllForcedDecisions();
      });

      expect(mockUserContext.decideAll).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe subscribeAllForcedDecisions listener on unmount', () => {
      mockClient = createMockClient(true);
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const unsubscribeAllFdSpy = vi.fn();
      const subscribeAllFdSpy = vi.spyOn(store, 'subscribeAllForcedDecisions').mockReturnValue(unsubscribeAllFdSpy);

      const wrapper = createWrapper(store, mockClient);
      const { unmount } = renderHook(() => useDecideAll(), { wrapper });

      expect(subscribeAllFdSpy).toHaveBeenCalledTimes(1);

      unmount();

      expect(unsubscribeAllFdSpy).toHaveBeenCalledTimes(1);
    });
  });
});
