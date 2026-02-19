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
import { ProviderStateStore } from './ProviderStateStore';

describe('ProviderStateStore', () => {
  let store: ProviderStateStore;

  /**
   * Creates a minimal mock OptimizelyUserContext with forced decision stubs.
   * This is needed because setUserContext wraps forced decision methods.
   */
  function createMockUserContext(overrides?: {
    setForcedDecision?: (...args: any[]) => boolean;
    removeForcedDecision?: (...args: any[]) => boolean;
    removeAllForcedDecisions?: () => boolean;
  }) {
    return {
      userId: 'test-user',
      setForcedDecision: overrides?.setForcedDecision ?? vi.fn().mockReturnValue(true),
      removeForcedDecision: overrides?.removeForcedDecision ?? vi.fn().mockReturnValue(true),
      removeAllForcedDecisions: overrides?.removeAllForcedDecisions ?? vi.fn().mockReturnValue(true),
    } as any;
  }

  beforeEach(() => {
    store = new ProviderStateStore();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState();

      expect(state.isClientReady).toBe(false);
      expect(state.userContext).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('should add listener and return unsubscribe function', () => {
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should notify listener when state changes', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.setClientReady(true);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isClientReady: true,
        })
      );
    });

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store.subscribe(listener1);
      store.subscribe(listener2);

      store.setClientReady(true);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should not notify after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      store.setClientReady(true);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple unsubscribes gracefully', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      unsubscribe(); // Second call should not throw

      store.setClientReady(true);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow re-subscribing after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe1 = store.subscribe(listener);

      unsubscribe1();

      const unsubscribe2 = store.subscribe(listener);
      store.setClientReady(true);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe2();
    });
  });

  describe('setClientReady', () => {
    it('should update isClientReady state', () => {
      store.setClientReady(true);

      expect(store.getState().isClientReady).toBe(true);
    });

    it('should not notify if value has not changed', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.setClientReady(false); // Same as initial value

      expect(listener).not.toHaveBeenCalled();
    });

    it('should preserve other state properties', () => {
      const mockUserContext = createMockUserContext();
      const mockError = new Error('test');

      store.setUserContext(mockUserContext);
      store.setError(mockError);
      store.setClientReady(true);

      const state = store.getState();
      expect(state.userContext).toBe(mockUserContext);
      expect(state.error).toBe(mockError);
      expect(state.isClientReady).toBe(true);
    });
  });

  describe('setUserContext', () => {
    it('should update userContext state', () => {
      const mockUserContext = createMockUserContext();

      store.setUserContext(mockUserContext);

      expect(store.getState().userContext).toBe(mockUserContext);
    });

    it('should allow setting userContext to null', () => {
      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      store.setUserContext(null);

      expect(store.getState().userContext).toBeNull();
    });

    it('should preserve other state properties', () => {
      const mockError = new Error('test');
      store.setClientReady(true);
      store.setError(mockError);

      const mockUserContext = createMockUserContext();
      store.setUserContext(mockUserContext);

      const state = store.getState();
      expect(state.isClientReady).toBe(true);
      expect(state.error).toBe(mockError);
    });
  });

  describe('setError', () => {
    it('should update error state', () => {
      const error = new Error('Test error');

      store.setError(error);

      expect(store.getState().error).toBe(error);
    });

    it('should allow clearing error', () => {
      const error = new Error('Test error');
      store.setError(error);

      store.setError(null);

      expect(store.getState().error).toBeNull();
    });

    it('should not notify if same error reference', () => {
      const error = new Error('Test error');
      store.setError(error);

      const listener = vi.fn();
      store.subscribe(listener);

      store.setError(error);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not clear other state when error is set', () => {
      const mockUserContext = createMockUserContext();
      store.setClientReady(true);
      store.setUserContext(mockUserContext);

      store.setError(new Error('test'));

      const state = store.getState();
      expect(state.isClientReady).toBe(true);
      expect(state.userContext).toBe(mockUserContext);
    });
  });

  describe('setState', () => {
    it('should batch update multiple properties', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      const mockUserContext = createMockUserContext();
      store.setState({
        isClientReady: true,
        userContext: mockUserContext,
      });

      // Should only notify once for batch update
      expect(listener).toHaveBeenCalledTimes(1);

      const state = store.getState();
      expect(state.isClientReady).toBe(true);
      expect(state.userContext).toBe(mockUserContext);
    });

    it('should allow partial updates', () => {
      store.setClientReady(true);

      store.setState({ error: new Error('test') });

      const state = store.getState();
      expect(state.isClientReady).toBe(true);
      expect(state.error).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const mockUserContext = createMockUserContext();
      store.setClientReady(true);
      store.setUserContext(mockUserContext);
      store.setError(new Error('test'));

      store.reset();

      const state = store.getState();
      expect(state.isClientReady).toBe(false);
      expect(state.userContext).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should notify listeners on reset', () => {
      const listener = vi.fn();
      store.setClientReady(true);
      store.subscribe(listener);

      store.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('forced decision reactivity', () => {
    it('setUserContext wraps forced decision methods', () => {
      const ctx = createMockUserContext();
      const listener = vi.fn();

      store.subscribeForcedDecision('flag-a', listener);
      store.setUserContext(ctx);

      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('subscribeForcedDecision delivers per-flagKey notifications', () => {
      const ctx = createMockUserContext();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      store.subscribeForcedDecision('flag-a', listenerA);
      store.subscribeForcedDecision('flag-b', listenerB);
      store.setUserContext(ctx);

      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).not.toHaveBeenCalled();
    });

    it('removeForcedDecision notifies per-flagKey', () => {
      const ctx = createMockUserContext();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      store.subscribeForcedDecision('flag-a', listenerA);
      store.subscribeForcedDecision('flag-b', listenerB);
      store.setUserContext(ctx);

      // First set, then remove
      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      listenerA.mockClear();

      ctx.removeForcedDecision({ flagKey: 'flag-a' });

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).not.toHaveBeenCalled();
    });

    it('removeAllForcedDecisions notifies all tracked flagKeys', () => {
      const ctx = createMockUserContext();
      const listenerA = vi.fn();
      const listenerB = vi.fn();
      const listenerC = vi.fn();

      store.subscribeForcedDecision('flag-a', listenerA);
      store.subscribeForcedDecision('flag-b', listenerB);
      store.subscribeForcedDecision('flag-c', listenerC);
      store.setUserContext(ctx);

      // Set forced decisions for flag-a and flag-b, but NOT flag-c
      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      ctx.setForcedDecision({ flagKey: 'flag-b' }, { variationKey: 'v2' });
      listenerA.mockClear();
      listenerB.mockClear();
      listenerC.mockClear();

      ctx.removeAllForcedDecisions();

      // flag-a and flag-b were tracked, so their listeners fire
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
      // flag-c was never set, so its listener should NOT fire
      expect(listenerC).not.toHaveBeenCalled();
    });

    it('failed forced decision does NOT notify', () => {
      const ctx = createMockUserContext({
        setForcedDecision: vi.fn().mockReturnValue(false),
        removeForcedDecision: vi.fn().mockReturnValue(false),
        removeAllForcedDecisions: vi.fn().mockReturnValue(false),
      });
      const listener = vi.fn();

      store.subscribeForcedDecision('flag-a', listener);
      store.setUserContext(ctx);

      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      ctx.removeForcedDecision({ flagKey: 'flag-a' });
      ctx.removeAllForcedDecisions();

      expect(listener).not.toHaveBeenCalled();
    });

    it('null context is not wrapped and does not throw', () => {
      expect(() => {
        store.setUserContext(null);
      }).not.toThrow();

      expect(store.getState().userContext).toBeNull();
    });

    it('new context replaces old wrapping — stale context does not notify', () => {
      const ctxA = createMockUserContext();
      const ctxB = createMockUserContext();
      const listener = vi.fn();

      store.subscribeForcedDecision('flag-a', listener);

      // Set ctxA, then replace with ctxB
      store.setUserContext(ctxA);
      store.setUserContext(ctxB);
      listener.mockClear();

      // Calling setForcedDecision on the OLD context (ctxA)
      // should NOT notify — staleness guard
      ctxA.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });

      expect(listener).not.toHaveBeenCalled();

      // Calling on the CURRENT context (ctxB) should notify
      ctxB.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v2' });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('stale context removeForcedDecision does not notify', () => {
      const ctxA = createMockUserContext();
      const ctxB = createMockUserContext();
      const listener = vi.fn();

      store.subscribeForcedDecision('flag-a', listener);

      store.setUserContext(ctxA);
      ctxA.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      listener.mockClear();

      // Replace with ctxB
      store.setUserContext(ctxB);
      listener.mockClear();

      // Old context remove — should not notify
      ctxA.removeForcedDecision({ flagKey: 'flag-a' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('stale context removeAllForcedDecisions does not notify', () => {
      const ctxA = createMockUserContext();
      const ctxB = createMockUserContext();
      const listener = vi.fn();

      store.subscribeForcedDecision('flag-a', listener);

      store.setUserContext(ctxA);
      ctxA.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      listener.mockClear();

      // Replace with ctxB
      store.setUserContext(ctxB);
      listener.mockClear();

      // Old context removeAll — should not notify
      ctxA.removeAllForcedDecisions();
      expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribe removes the listener', () => {
      const ctx = createMockUserContext();
      const listener = vi.fn();

      const unsubscribe = store.subscribeForcedDecision('flag-a', listener);
      store.setUserContext(ctx);

      // First call — should notify
      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      listener.mockClear();

      // Second call — should NOT notify
      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v2' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('reset clears forced decision listeners', () => {
      const ctx = createMockUserContext();
      const listener = vi.fn();

      store.subscribeForcedDecision('flag-a', listener);
      store.setUserContext(ctx);

      ctx.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v1' });
      expect(listener).toHaveBeenCalledTimes(1);
      listener.mockClear();

      // Reset the store
      store.reset();

      // Set a new context and trigger forced decision
      const ctxNew = createMockUserContext();
      store.setUserContext(ctxNew);

      ctxNew.setForcedDecision({ flagKey: 'flag-a' }, { variationKey: 'v2' });

      // Old listener should not be called — it was cleared by reset
      expect(listener).not.toHaveBeenCalled();
    });

    it('original methods are still called on the underlying context', () => {
      const originalSet = vi.fn().mockReturnValue(true);
      const originalRemove = vi.fn().mockReturnValue(true);
      const originalRemoveAll = vi.fn().mockReturnValue(true);

      const ctx = createMockUserContext({
        setForcedDecision: originalSet,
        removeForcedDecision: originalRemove,
        removeAllForcedDecisions: originalRemoveAll,
      });

      store.setUserContext(ctx);

      const decisionContext = { flagKey: 'flag-a' };
      const decision = { variationKey: 'v1' };

      ctx.setForcedDecision(decisionContext, decision);
      expect(originalSet).toHaveBeenCalledWith(decisionContext, decision);

      ctx.removeForcedDecision(decisionContext);
      expect(originalRemove).toHaveBeenCalledWith(decisionContext);

      ctx.removeAllForcedDecisions();
      expect(originalRemoveAll).toHaveBeenCalled();
    });
  });
});
