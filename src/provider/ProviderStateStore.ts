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

import type { OptimizelyUserContext } from '@optimizely/optimizely-sdk';
import type { ProviderState } from './types';

/**
 * Listener function type for state subscriptions.
 */
export type StateListener = (state: ProviderState) => void;

/**
 * Initial state for the provider store.
 */
const initialState: ProviderState = {
  isClientReady: false,
  userContext: null,
  error: null,
};

/**
 * Observable store holding shared Provider state.
 *
 * The store follows a simple observable pattern:
 * - Hooks subscribe via `subscribe()` and receive state updates
 * - Provider updates state via setter methods
 * - State is immutable - each update creates a new state object
 */
export class ProviderStateStore {
  private state: ProviderState;
  private listeners: Set<StateListener>;

  constructor() {
    this.state = { ...initialState };
    this.listeners = new Set();
  }

  /**
   * Get the current state snapshot.
   * Returns a reference to the current state object.
   */
  getState(): ProviderState {
    return this.state;
  }

  /**
   * Subscribe to state changes.
   *
   * @param listener - Callback invoked with new state on each change
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set whether the client is ready.
   * e.g: Called by Provider after client.onReady() resolves.
   */
  setClientReady(ready: boolean): void {
    if (this.state.isClientReady === ready) {
      return;
    }

    this.state = {
      ...this.state,
      isClientReady: ready,
    };
    this.notifyListeners();
  }

  /**
   * Set the current user context.
   * e.g: Called by UserContextManager when user context is created.
   */
  setUserContext(ctx: OptimizelyUserContext | null): void {
    // Always update userContext even if same reference -
    // user attributes may have changed
    this.state = {
      ...this.state,
      userContext: ctx,
    };
    this.notifyListeners();
  }

  /**
   * Set an error that occurred during initialization.
   * Setting an error does NOT clear userContext or isClientReady.
   */
  setError(error: Error | null): void {
    if (this.state.error === error) {
      return; // No change, skip notification
    }

    this.state = {
      ...this.state,
      error,
    };
    this.notifyListeners();
  }

  /**
   * Batch update multiple state properties at once.
   * Useful when multiple state changes should trigger a single notification.
   */
  setState(partialState: Partial<ProviderState>): void {
    this.state = {
      ...this.state,
      ...partialState,
    };
    this.notifyListeners();
  }

  /**
   * Reset store to initial state.
   * Useful for testing or when Provider unmounts.
   */
  reset(): void {
    this.state = { ...initialState };
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state change.
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }
}
