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
import React, { act, useContext } from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import type { Client as OptimizelyClient, OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { OptimizelyProvider, OptimizelyContext } from './OptimizelyProvider';
import { REACT_CLIENT_META } from '../client';
import type { ReactClientMeta } from '../client';
import type { OptimizelyContextValue } from './types';

/**
 * Create a mock Optimizely client for testing.
 */
function createMockClient(
  overrides: Partial<OptimizelyClient> = {},
  meta: Partial<ReactClientMeta> = {}
): OptimizelyClient {
  const mockUserContext: OptimizelyUserContext = {
    getUserId: vi.fn().mockReturnValue('test-user'),
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

  const client = {
    // onReady() resolves when client is ready, rejects on timeout/error
    onReady: vi.fn().mockResolvedValue(undefined),
    createUserContext: vi.fn().mockReturnValue(mockUserContext),
    close: vi.fn(),
    getOptimizelyConfig: vi.fn(),
    notificationCenter: {
      addNotificationListener: vi.fn().mockReturnValue(1),
      removeNotificationListener: vi.fn(),
    } as unknown as OptimizelyClient['notificationCenter'],
    sendOdpEvent: vi.fn(),
    isOdpIntegrated: vi.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as OptimizelyClient;

  (client as unknown as Record<symbol, ReactClientMeta>)[REACT_CLIENT_META] = {
    hasOdpManager: meta.hasOdpManager ?? false,
    hasVuidManager: meta.hasVuidManager ?? false,
  };

  return client;
}

/**
 * Test component that consumes and exposes context value.
 */
function ContextConsumer({ onContext }: { onContext: (ctx: OptimizelyContextValue | null) => void }) {
  const context = useContext(OptimizelyContext);
  React.useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return <div data-testid="consumer">Consumer</div>;
}

describe('OptimizelyProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('context value', () => {
    it('should provide context with store and client', async () => {
      const mockClient = createMockClient();
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      expect(capturedContext!.client).toBe(mockClient);
      expect(capturedContext!.store).toBeDefined();
      expect(typeof capturedContext!.store.getState).toBe('function');
      expect(typeof capturedContext!.store.subscribe).toBe('function');
    });

    it('should provide stable context value across re-renders', async () => {
      const mockClient = createMockClient();
      const capturedContexts: (OptimizelyContextValue | null)[] = [];

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }}>
          <ContextConsumer onContext={(ctx) => capturedContexts.push(ctx)} />
        </OptimizelyProvider>
      );

      // Re-render with same client but different user
      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-2' }}>
          <ContextConsumer onContext={(ctx) => capturedContexts.push(ctx)} />
        </OptimizelyProvider>
      );

      // Context value should be stable (same reference) when client doesn't change
      const firstContext = capturedContexts[0];
      const lastContext = capturedContexts[capturedContexts.length - 1];

      expect(firstContext).toBe(lastContext);
    });
  });

  describe('client.onReady()', () => {
    it('should call onReady with undefined timeout when not provided', async () => {
      const mockClient = createMockClient();

      render(
        <OptimizelyProvider client={mockClient}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.onReady).toHaveBeenCalledWith({ timeout: undefined });
    });

    it('should call onReady with custom timeout', async () => {
      const mockClient = createMockClient();

      render(
        <OptimizelyProvider client={mockClient} timeout={5000}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.onReady).toHaveBeenCalledWith({ timeout: 5000 });
    });

    it('should not set error when onReady succeeds', async () => {
      const mockClient = createMockClient({
        onReady: vi.fn().mockResolvedValue(undefined),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
      });

      expect(capturedContext!.store.getState().error).toBeNull();
    });

    it('should set error when onReady rejects', async () => {
      const testError = new Error('Client initialization failed');
      const mockClient = createMockClient({
        onReady: vi.fn().mockRejectedValue(testError),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
        expect(capturedContext!.store.getState().error).toBe(testError);
      });
    });

    it('should set error when onReady times out (rejects)', async () => {
      const timeoutError = new Error('onReady timeout after 100ms');
      const mockClient = createMockClient({
        onReady: vi.fn().mockRejectedValue(timeoutError),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient} timeout={100}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
        expect(capturedContext!.store.getState().error).toBe(timeoutError);
      });
    });
  });

  describe('error handling', () => {
    it('should set error when client is not provided', async () => {
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={null as unknown as OptimizelyClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.store.getState().error?.message).toBe('Optimizely client is required');
    });
  });

  describe('cleanup', () => {
    it('should reset store on unmount', async () => {
      const mockClient = createMockClient();
      let capturedContext: OptimizelyContextValue | null = null;

      const { unmount } = render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
      });

      const store = capturedContext!.store;

      unmount();

      // Store should be reset
      expect(store.getState().userContext).toBeNull();
      expect(store.getState().error).toBeNull();
    });
  });

  describe('rendering', () => {
    it('should render children', () => {
      const mockClient = createMockClient();

      render(
        <OptimizelyProvider client={mockClient}>
          <div data-testid="child">Hello World</div>
        </OptimizelyProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render without children', () => {
      const mockClient = createMockClient();

      expect(() => {
        render(<OptimizelyProvider client={mockClient} />);
      }).not.toThrow();
    });
  });

  describe('user context lifecycle', () => {
    it('should create user context with userId on mount', async () => {
      const mockClient = createMockClient();

      render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1', attributes: { plan: 'pro' } }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledWith('user-1', { plan: 'pro' });
    });

    it('should set userContext on the store when user context is created', async () => {
      const mockClient = createMockClient();
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.store.getState().userContext).not.toBeNull();
    });

    it('should recreate user context when user id changes', async () => {
      const mockClient = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledWith('user-1', undefined);

      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-2' }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledWith('user-2', undefined);
    });

    it('should not recreate user context when user prop is value-equal', async () => {
      const mockClient = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1', attributes: { plan: 'pro' } }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);

      // Re-render with new object reference but same values
      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1', attributes: { plan: 'pro' } }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      // Should still only have been called once
      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);
    });

    it('should pass qualifiedSegments to createUserContext', async () => {
      const mockUserContext = {
        getUserId: vi.fn().mockReturnValue('user-1'),
        qualifiedSegments: null as string[] | null,
        fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
        setForcedDecision: vi.fn(),
        removeForcedDecision: vi.fn(),
        removeAllForcedDecisions: vi.fn(),
      } as unknown as OptimizelyUserContext;

      const mockClient = createMockClient({
        createUserContext: vi.fn().mockReturnValue(mockUserContext),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} qualifiedSegments={['seg-a', 'seg-b']}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.store.getState().userContext).not.toBeNull();
      expect(mockUserContext.qualifiedSegments).toEqual(['seg-a', 'seg-b']);
    });

    it('should dispose manager and recreate when client changes', async () => {
      const mockClient1 = createMockClient();
      const mockClient2 = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient1} user={{ id: 'user-1' }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient1.createUserContext).toHaveBeenCalledWith('user-1', undefined);

      rerender(
        <OptimizelyProvider client={mockClient2} user={{ id: 'user-1' }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient2.createUserContext).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should dispose manager on unmount', async () => {
      const mockClient = createMockClient();
      let capturedContext: OptimizelyContextValue | null = null;

      const { unmount } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.store.getState().userContext).not.toBeNull();

      unmount();

      // Store should be reset after unmount
      expect(capturedContext!.store.getState().userContext).toBeNull();
    });

    it('should recreate user context when only attributes change (same id)', async () => {
      const mockClient = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1', attributes: { plan: 'free' } }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);
      expect(mockClient.createUserContext).toHaveBeenCalledWith('user-1', { plan: 'free' });

      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1', attributes: { plan: 'pro' } }}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(2);
      expect(mockClient.createUserContext).toHaveBeenCalledWith('user-1', { plan: 'pro' });
    });

    it('should recreate user context when qualifiedSegments change', async () => {
      const mockUserContext = {
        getUserId: vi.fn().mockReturnValue('user-1'),
        qualifiedSegments: null as string[] | null,
        fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
        setForcedDecision: vi.fn(),
        removeForcedDecision: vi.fn(),
        removeAllForcedDecisions: vi.fn(),
      } as unknown as OptimizelyUserContext;

      const mockClient = createMockClient({
        createUserContext: vi.fn().mockReturnValue(mockUserContext),
      });

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} qualifiedSegments={['seg-a']}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);

      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} qualifiedSegments={['seg-a', 'seg-b']}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(2);
    });

    it('should not recreate user context when qualifiedSegments are value-equal', async () => {
      const mockClient = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} qualifiedSegments={['seg-a', 'seg-b']}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);

      // Re-render with new array reference but same values
      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} qualifiedSegments={['seg-a', 'seg-b']}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);
    });

    it('should create user context without userId when user prop is not provided', async () => {
      const mockClient = createMockClient();

      render(
        <OptimizelyProvider client={mockClient}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('skipSegments', () => {
    it('should pass skipSegments to UserContextManager', async () => {
      const mockClient = createMockClient({ isOdpIntegrated: vi.fn().mockReturnValue(true) }, { hasOdpManager: true });

      render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} skipSegments={true}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledWith('user-1', undefined);

      // When skipSegments is true, fetchQualifiedSegments should NOT be called
      const userCtx = (mockClient.createUserContext as ReturnType<typeof vi.fn>).mock.results[0].value;

      expect(userCtx.fetchQualifiedSegments).not.toHaveBeenCalled();
    });

    it('should recreate user context when skipSegments changes', async () => {
      const mockClient = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} skipSegments={false}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(1);

      // Change skipSegments — UCM detects the change and recreates user context
      rerender(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }} skipSegments={true}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.createUserContext).toHaveBeenCalledTimes(2);
    });
  });

  describe('async lifecycle guards', () => {
    it('should not update state when unmounted before onReady resolves', async () => {
      let resolveOnReady: () => void;
      const onReadyPromise = new Promise<void>((resolve) => {
        resolveOnReady = resolve;
      });
      const mockClient = createMockClient({
        onReady: vi.fn().mockReturnValue(onReadyPromise),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      const { unmount } = render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      const store = capturedContext!.store;

      // Unmount before onReady resolves
      unmount();

      // Now resolve onReady
      await act(async () => {
        resolveOnReady!();
      });

      // Store was reset on unmount, onReady resolution should not affect store
      expect(store.getState().error).toBeNull();
    });

    it('should call onReady again when client changes', async () => {
      const mockClient1 = createMockClient();
      const mockClient2 = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient1}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient1.onReady).toHaveBeenCalledTimes(1);

      rerender(
        <OptimizelyProvider client={mockClient2}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient2.onReady).toHaveBeenCalledTimes(1);
    });

    it('should wrap non-Error rejection from onReady in an Error', async () => {
      const mockClient = createMockClient({
        onReady: vi.fn().mockRejectedValue('string error'),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
        const error = capturedContext!.store.getState().error;
        expect(error).toBeInstanceOf(Error);
        expect(error!.message).toBe('string error');
      });
    });
  });

  describe('manager error propagation', () => {
    it('should set error on store when UserContextManager reports an error', async () => {
      const mockClient = createMockClient({
        createUserContext: vi.fn().mockImplementation(() => {
          throw new Error('createUserContext failed');
        }),
      });
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient} user={{ id: 'user-1' }}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
        expect(capturedContext!.store.getState().error).not.toBeNull();
        expect(capturedContext!.store.getState().error!.message).toBe('createUserContext failed');
      });
    });
  });

  describe('config update subscription', () => {
    it('should subscribe to OPTIMIZELY_CONFIG_UPDATE on mount', () => {
      const mockClient = createMockClient();

      render(
        <OptimizelyProvider client={mockClient}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient.notificationCenter.addNotificationListener).toHaveBeenCalledWith(
        'OPTIMIZELY_CONFIG_UPDATE',
        expect.any(Function)
      );
    });

    it('should remove notification listener on unmount', () => {
      const mockClient = createMockClient();

      const { unmount } = render(
        <OptimizelyProvider client={mockClient}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      unmount();

      expect(mockClient.notificationCenter.removeNotificationListener).toHaveBeenCalledWith(1);
    });

    it('should trigger store state change when config update fires', async () => {
      const mockClient = createMockClient();
      let capturedContext: OptimizelyContextValue | null = null;

      render(
        <OptimizelyProvider client={mockClient}>
          <ContextConsumer onContext={(ctx) => (capturedContext = ctx)} />
        </OptimizelyProvider>
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
      });

      const stateBefore = capturedContext!.store.getState();

      // Get the callback that was registered and invoke it
      const configUpdateCallback = (
        mockClient.notificationCenter.addNotificationListener as ReturnType<typeof vi.fn>
      ).mock.calls.find((call: unknown[]) => call[0] === 'OPTIMIZELY_CONFIG_UPDATE')![1];

      await act(() => {
        configUpdateCallback();
      });

      const stateAfter = capturedContext!.store.getState();

      // State should be a new reference (triggers useSyncExternalStore subscribers)
      expect(stateBefore).not.toBe(stateAfter);
    });

    it('should re-subscribe when client changes', () => {
      const mockClient1 = createMockClient();
      const mockClient2 = createMockClient();

      const { rerender } = render(
        <OptimizelyProvider client={mockClient1}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      expect(mockClient1.notificationCenter.addNotificationListener).toHaveBeenCalledTimes(1);

      rerender(
        <OptimizelyProvider client={mockClient2}>
          <div>Child</div>
        </OptimizelyProvider>
      );

      // Old listener cleaned up, new one registered
      expect(mockClient1.notificationCenter.removeNotificationListener).toHaveBeenCalledWith(1);
      expect(mockClient2.notificationCenter.addNotificationListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('context reference identity', () => {
    it('should change context value reference when client changes', async () => {
      const mockClient1 = createMockClient();
      const mockClient2 = createMockClient();
      const capturedContexts: (OptimizelyContextValue | null)[] = [];

      const { rerender } = render(
        <OptimizelyProvider client={mockClient1}>
          <ContextConsumer onContext={(ctx) => capturedContexts.push(ctx)} />
        </OptimizelyProvider>
      );

      rerender(
        <OptimizelyProvider client={mockClient2}>
          <ContextConsumer onContext={(ctx) => capturedContexts.push(ctx)} />
        </OptimizelyProvider>
      );

      // Context value should be a different reference when client changes
      const firstContext = capturedContexts[0];
      const lastContext = capturedContexts[capturedContexts.length - 1];

      expect(firstContext).not.toBe(lastContext);
      expect(firstContext!.client).toBe(mockClient1);
      expect(lastContext!.client).toBe(mockClient2);
    });
  });
});
