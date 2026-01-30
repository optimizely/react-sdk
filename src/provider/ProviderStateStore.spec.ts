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
      const mockUserContext = { userId: 'test-user' } as any;
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
      const mockUserContext = { userId: 'test-user' } as any;

      store.setUserContext(mockUserContext);

      expect(store.getState().userContext).toBe(mockUserContext);
    });

    it('should allow setting userContext to null', () => {
      const mockUserContext = { userId: 'test-user' } as any;
      store.setUserContext(mockUserContext);

      store.setUserContext(null);

      expect(store.getState().userContext).toBeNull();
    });

    it('should preserve other state properties', () => {
      const mockError = new Error('test');
      store.setClientReady(true);
      store.setError(mockError);

      const mockUserContext = { userId: 'test-user' } as any;
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
      const mockUserContext = { userId: 'test-user' } as any;
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

      const mockUserContext = { userId: 'test-user' } as any;
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
      const mockUserContext = { userId: 'test-user' } as any;
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
});
