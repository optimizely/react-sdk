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
 * Listener function type for per-flagKey forced decision subscriptions.
 */
export type ForcedDecisionListener = () => void;

/**
 * Initial state for the provider store.
 */
const initialState: ProviderState = {
  userContext: null,
  error: null,
};

/**
 * Observable store holding shared Provider state.
 *
 * The store follows a simple observable pattern:
 * - Hooks subscribe via `subscribe()` and receive state updates
 * - Provider updates state via setter methods
 * - Listeners are notified on state changes via callbacks
 */
export class ProviderStateStore {
  private state: ProviderState;
  private listeners: Set<StateListener>;
  private forcedDecisionListeners: Map<string, Set<ForcedDecisionListener>>;
  private allForcedDecisionListeners: Set<ForcedDecisionListener>;
  private notifyScheduled = false;

  constructor() {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.forcedDecisionListeners = new Map();
    this.allForcedDecisionListeners = new Set();
  }

  /**
   * Get the current state snapshot.
   * Each state change creates a new object, so reference equality
   * can be used to detect changes.
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
   * Set the current user context.
   * e.g: Called by UserContextManager when user context is created.
   *
   * When a non-null context is provided, its forced decision methods
   * (setForcedDecision, removeForcedDecision, removeAllForcedDecisions)
   * are wrapped to trigger per-flagKey notifications, enabling React
   * hooks to re-evaluate only the affected flag.
   */
  setUserContext(ctx: OptimizelyUserContext | null): void {
    if (ctx) {
      this.wrapForcedDecisionMethods(ctx);
    }
    // Always update userContext even if same reference -
    // user attributes may have changed
    this.state = { ...this.state, userContext: ctx };
    this.notifyListeners();
  }

  /**
   * Set an error that occurred during initialization.
   * Setting an error does NOT clear userContext.
   */
  setError(error: Error | null): void {
    if (this.state.error === error) {
      return; // No change, skip notification
    }

    this.state = { ...this.state, error };
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
   * Signal that external state (e.g. client config) has changed.
   * Creates a new state reference so useSyncExternalStore triggers
   * re-renders and hooks re-evaluate decisions.
   */
  refresh(): void {
    this.state = { ...this.state };
    this.notifyListeners();
  }

  /**
   * Reset store to initial state.
   * Useful for testing or when Provider unmounts.
   */
  reset(): void {
    this.state = { ...initialState };
    this.forcedDecisionListeners.clear();
    this.allForcedDecisionListeners.clear();
    this.notifyListeners();
  }

  /**
   * Subscribe to forced decision changes for a specific flagKey.
   * Hooks use this to re-evaluate decisions only when their flag is affected.
   *
   * @param flagKey - The flag key to watch
   * @param callback - Called when a forced decision for this flagKey changes
   * @returns Unsubscribe function
   */
  subscribeForcedDecision(flagKey: string, callback: ForcedDecisionListener): () => void {
    if (!this.forcedDecisionListeners.has(flagKey)) {
      this.forcedDecisionListeners.set(flagKey, new Set());
    }
    const listeners = this.forcedDecisionListeners.get(flagKey)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.forcedDecisionListeners.delete(flagKey);
      }
    };
  }

  /**
   * Subscribe to forced decision changes for all flagKeys.
   * Used by hooks like useDecideAll that need to react to any forced decision change.
   *
   * @param callback - Called when any forced decision changes
   * @returns Unsubscribe function
   */
  subscribeAllForcedDecisions(callback: ForcedDecisionListener): () => void {
    this.allForcedDecisionListeners.add(callback);
    return () => {
      this.allForcedDecisionListeners.delete(callback);
    };
  }

  /**
   * Notify listeners subscribed to a specific flagKey.
   * Also notifies "all" forced decision listeners.
   * Called internally by wrapped forced decision methods.
   */
  notifyForcedDecision(flagKey: string): void {
    const listeners = this.forcedDecisionListeners.get(flagKey);
    if (listeners) {
      listeners.forEach((cb) => cb());
    }
    this.allForcedDecisionListeners.forEach((cb) => cb());
  }

  /**
   * Wrap forced decision methods on a user context to trigger per-flagKey
   * notifications on mutation. This enables React hooks to re-evaluate
   * only when the specific flag they watch has a forced decision change.
   *
   * Each wrapped context gets its own `forcedDecisionFlagKeys` set (via closure)
   * so that `removeAllForcedDecisions` can notify all relevant hooks.
   *
   * A staleness guard (`store.state.userContext === ctx`) prevents stale
   * contexts captured in React closures from triggering spurious re-renders
   * and impression events on the wrong user context.
   */
  private wrapForcedDecisionMethods(ctx: OptimizelyUserContext): void {
    const forcedDecisionFlagKeys = new Set<string>();
    const originalSet = ctx.setForcedDecision.bind(ctx);
    const originalRemove = ctx.removeForcedDecision.bind(ctx);
    const originalRemoveAll = ctx.removeAllForcedDecisions.bind(ctx);

    ctx.setForcedDecision = (context, decision) => {
      const result = originalSet(context, decision);
      if (result) {
        forcedDecisionFlagKeys.add(context.flagKey);
        if (this.state.userContext === ctx) {
          this.notifyForcedDecision(context.flagKey);
        }
      }
      return result;
    };

    ctx.removeForcedDecision = (context) => {
      const result = originalRemove(context);
      if (result) {
        forcedDecisionFlagKeys.delete(context.flagKey);
        if (this.state.userContext === ctx) {
          this.notifyForcedDecision(context.flagKey);
        }
      }
      return result;
    };

    ctx.removeAllForcedDecisions = () => {
      const result = originalRemoveAll();
      if (result) {
        if (this.state.userContext === ctx) {
          forcedDecisionFlagKeys.forEach((flagKey) => this.notifyForcedDecision(flagKey));
        }
        forcedDecisionFlagKeys.clear();
      }
      return result;
    };
  }

  /**
   * Notify all listeners of state change.
   *
   * Notifications are deferred via queueMicrotask to avoid triggering
   * setState in subscriber hooks (e.g. useDecide -> useSyncExternalStore)
   * while the Provider component is still rendering.
   *
   * The state itself is updated synchronously so getState() returns the correct value
   * immediately (required for SSR).
   *
   * Multiple synchronous state changes are batched into a single notification.
   */
  private notifyListeners(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      this.listeners.forEach((listener) => {
        listener(this.state);
      });
    });
  }
}
