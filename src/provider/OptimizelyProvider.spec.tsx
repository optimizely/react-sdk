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

import { vi, describe, it, expect } from 'vitest';
import React, { useContext } from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import type { Client as OptimizelyClient, OptimizelyUserContext } from '@optimizely/optimizely-sdk';

import { OptimizelyProvider, OptimizelyContext } from './OptimizelyProvider';
import type { OptimizelyContextValue } from './types';

/**
 * Create a mock Optimizely client for testing.
 */
function createMockClient(overrides: Partial<OptimizelyClient> = {}): OptimizelyClient {
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
  } as unknown as OptimizelyUserContext;

  return {
    // onReady() resolves when client is ready, rejects on timeout/error
    onReady: vi.fn().mockResolvedValue(undefined),
    createUserContext: vi.fn().mockReturnValue(mockUserContext),
    close: vi.fn(),
    getOptimizelyConfig: vi.fn(),
    notificationCenter: {} as OptimizelyClient['notificationCenter'],
    sendOdpEvent: vi.fn(),
    isOdpIntegrated: vi.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as OptimizelyClient;
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

    it('should set isClientReady to true when onReady succeeds', async () => {
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
        expect(capturedContext!.store.getState().isClientReady).toBe(true);
      });

      expect(capturedContext!.store.getState().error).toBeNull();
    });

    it('should set isClientReady to false and set error when onReady rejects', async () => {
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

      // Client is NOT ready when onReady rejects
      expect(capturedContext!.store.getState().isClientReady).toBe(false);
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

      expect(capturedContext!.store.getState().isClientReady).toBe(false);
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
        expect(capturedContext!.store.getState().isClientReady).toBe(true);
      });

      const store = capturedContext!.store;

      unmount();

      // Store should be reset
      expect(store.getState().isClientReady).toBe(false);
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
});
