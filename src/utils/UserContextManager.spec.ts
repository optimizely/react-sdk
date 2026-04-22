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
import type { Client, OptimizelyUserContext } from '@optimizely/optimizely-sdk';
import { REACT_CLIENT_META } from '../client';
import type { ReactClientMeta } from '../client';
import { UserContextManager } from './UserContextManager';

// --- Helpers ---

function createDeferred<T = unknown>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface MockClientOptions {
  hasOdpManager?: boolean;
  hasVuidManager?: boolean;
  isOdpIntegrated?: boolean;
  fetchQualifiedSegmentsResult?: boolean;
}

function createMockClient(opts: MockClientOptions = {}) {
  const {
    hasOdpManager = false,
    hasVuidManager = false,
    isOdpIntegrated = false,
    fetchQualifiedSegmentsResult = true,
  } = opts;

  const mockUserContext = {
    fetchQualifiedSegments: vi.fn().mockResolvedValue(fetchQualifiedSegmentsResult),
    getUserId: vi.fn().mockReturnValue('test-user'),
    qualifiedSegments: null as string[] | null,
  } as unknown as OptimizelyUserContext;

  const onReadyDeferred = createDeferred();

  const client = {
    onReady: vi.fn().mockReturnValue(onReadyDeferred.promise),
    createUserContext: vi.fn().mockReturnValue(mockUserContext),
    isOdpIntegrated: vi.fn().mockReturnValue(isOdpIntegrated),
  } as unknown as Client;

  const meta: ReactClientMeta = { hasOdpManager, hasVuidManager };
  (client as unknown as Record<symbol, ReactClientMeta>)[REACT_CLIENT_META] = meta;

  return {
    client,
    mockUserContext,
    onReadyDeferred,
  };
}

function createManagerConfig(client: Client) {
  const onUserContextReady = vi.fn();
  const onError = vi.fn();
  return {
    client,
    onUserContextReady,
    onError,
  };
}

/** Flush all pending microtasks */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// --- Tests ---

describe('UserContextManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Scenario 1: ODP Not Enabled
  // ============================================================
  describe('ODP not enabled', () => {
    describe('userId present', () => {
      it('should create context synchronously and call onUserContextReady immediately', async () => {
        const { client, mockUserContext } = createMockClient({
          hasOdpManager: false,
          hasVuidManager: false,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1', attributes: { plan: 'premium' } });

        expect(client.createUserContext).toHaveBeenCalledWith('user-1', { plan: 'premium' });
        expect(client.onReady).not.toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(config.onError).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('no userId + VUID enabled', () => {
      it('should await onReady for VUID then create context', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: false,
          hasVuidManager: true,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext(); // no user
        await flushPromises();

        // Should be waiting on onReady
        expect(client.onReady).toHaveBeenCalled();
        expect(config.onUserContextReady).not.toHaveBeenCalled();

        // Resolve onReady (VUID init complete)
        onReadyDeferred.resolve(undefined);
        await flushPromises();

        expect(client.createUserContext).toHaveBeenCalledWith(undefined, undefined);
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(config.onError).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('no userId + VUID not enabled', () => {
      it('should call onError with the error thrown by createUserContext', async () => {
        const { client } = createMockClient({
          hasOdpManager: false,
          hasVuidManager: false,
        });
        const sdkError = new Error('INVALID_IDENTIFIER');
        (client.createUserContext as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw sdkError;
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext();
        await flushPromises();

        expect(client.onReady).not.toHaveBeenCalled();
        expect(config.onUserContextReady).not.toHaveBeenCalled();
        expect(config.onError).toHaveBeenCalledWith(sdkError);

        manager.dispose();
      });
    });
  });

  // ============================================================
  // Scenario 2: ODP Enabled
  // ============================================================
  describe('ODP enabled', () => {
    describe('userId + skipSegments=false', () => {
      it('should create context, wait for onReady, check ODP integration, fetch segments', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
          isOdpIntegrated: true,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' });

        await flushPromises();

        // Should have created context synchronously (userId present)
        expect(client.createUserContext).toHaveBeenCalledWith('user-1', undefined);
        // Should be waiting on onReady for ODP config
        expect(client.onReady).toHaveBeenCalled();
        expect(config.onUserContextReady).not.toHaveBeenCalled();

        // Resolve onReady
        onReadyDeferred.resolve(undefined);
        await flushPromises();

        expect(client.isOdpIntegrated).toHaveBeenCalled();
        expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(config.onError).not.toHaveBeenCalled();

        manager.dispose();
      });

      it('should skip fetchQualifiedSegments when ODP is not integrated in datafile', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
          isOdpIntegrated: false, // datafile doesn't have ODP config
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' });
        await flushPromises();

        onReadyDeferred.resolve(undefined);
        await flushPromises();

        expect(client.isOdpIntegrated).toHaveBeenCalled();
        expect(mockUserContext.fetchQualifiedSegments).not.toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);

        manager.dispose();
      });
    });

    describe('no userId + VUID + skipSegments=false', () => {
      it('should await onReady (VUID+ODP), create context, fetch segments', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: true,
          isOdpIntegrated: true,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext(); // no user
        await flushPromises();

        // Waiting on onReady for VUID
        expect(client.onReady).toHaveBeenCalledTimes(1);
        expect(config.onUserContextReady).not.toHaveBeenCalled();

        // Resolve onReady (both VUID and ODP ready)
        onReadyDeferred.resolve(undefined);
        await flushPromises();

        expect(client.createUserContext).toHaveBeenCalledWith(undefined, undefined);
        // onReady called twice: once for VUID, once for ODP (second is a no-op)
        expect(client.onReady).toHaveBeenCalledTimes(2);
        expect(client.isOdpIntegrated).toHaveBeenCalled();
        expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(config.onError).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('userId + skipSegments=true', () => {
      it('should create context synchronously and call onUserContextReady immediately', async () => {
        const { client, mockUserContext } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, undefined, true);

        expect(client.createUserContext).toHaveBeenCalledWith('user-1', undefined);
        expect(client.onReady).not.toHaveBeenCalled();
        expect(mockUserContext.fetchQualifiedSegments).not.toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(config.onError).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('no userId + VUID + skipSegments=true', () => {
      it('should await onReady for VUID only, create context, skip segments', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: true,
          isOdpIntegrated: true,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext(undefined, undefined, true); // no user, skipSegments
        await flushPromises();

        expect(client.onReady).toHaveBeenCalledTimes(1);
        expect(config.onUserContextReady).not.toHaveBeenCalled();

        onReadyDeferred.resolve(undefined);
        await flushPromises();

        expect(client.createUserContext).toHaveBeenCalledWith(undefined, undefined);
        // Only one onReady call (for VUID), no segment fetch
        expect(client.onReady).toHaveBeenCalledTimes(1);
        expect(mockUserContext.fetchQualifiedSegments).not.toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(config.onError).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('no userId + VUID not enabled + skipSegments=true', () => {
      it('should call onError with the error thrown by createUserContext', async () => {
        const { client } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
        });
        const sdkError = new Error('INVALID_IDENTIFIER');
        (client.createUserContext as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw sdkError;
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext(undefined, undefined, true); // no user, no VUID, skipSegments
        await flushPromises();

        expect(client.onReady).not.toHaveBeenCalled();
        expect(config.onUserContextReady).not.toHaveBeenCalled();
        expect(config.onError).toHaveBeenCalledWith(sdkError);

        manager.dispose();
      });
    });
  });

  // ============================================================
  // Scenario 3: Pre-set Qualified Segments
  // ============================================================
  describe('pre-set qualified segments', () => {
    describe('qualifiedSegments + skipSegments=true', () => {
      it('should set ctx.qualifiedSegments, fire onUserContextReady once, no background fetch', async () => {
        const { client, mockUserContext } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b'], true);

        expect(client.createUserContext).toHaveBeenCalledWith('user-1', undefined);
        expect(mockUserContext.qualifiedSegments).toEqual(['seg-a', 'seg-b']);
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);
        expect(config.onUserContextReady).toHaveBeenCalledWith(mockUserContext);
        expect(mockUserContext.fetchQualifiedSegments).not.toHaveBeenCalled();
        expect(client.onReady).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('qualifiedSegments + skipSegments=false + ODP + segments match', () => {
      it('should callback with pre-set segments immediately than skip second callback when background fetch returns matching segments', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
          isOdpIntegrated: true,
        });
        // fetchQualifiedSegments will keep the same segments (simulate match)
        (mockUserContext.fetchQualifiedSegments as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          mockUserContext.qualifiedSegments = ['seg-a', 'seg-b'];
          return true;
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b']);

        // Immediate callback with pre-set segments
        expect(mockUserContext.qualifiedSegments).toEqual(['seg-a', 'seg-b']);
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

        // Background fetch waiting on onReady
        expect(client.onReady).toHaveBeenCalled();

        onReadyDeferred.resolve(undefined);
        await flushPromises();

        // Background fetch returned matching segments — no second callback
        expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

        manager.dispose();
      });
    });

    describe('qualifiedSegments + skipSegments=false + ODP + segments differ', () => {
      it('should callback with pre-set segments immediately then callback again when background fetch returns different segments', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
          isOdpIntegrated: true,
        });
        // fetchQualifiedSegments returns different segments
        (mockUserContext.fetchQualifiedSegments as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          mockUserContext.qualifiedSegments = ['seg-a', 'seg-c'];
          return true;
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b']);

        // Immediate callback with pre-set segments
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

        onReadyDeferred.resolve(undefined);
        await flushPromises();

        // Background fetch returned different segments — second callback fires
        expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledTimes(2);

        manager.dispose();
      });
    });

    describe('qualifiedSegments + skipSegments=false + ODP not integrated', () => {
      it('should callback with pre-set segments immediately and skip background fetch when ODP is not integrated', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
          isOdpIntegrated: false,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, ['seg-a']);

        // Immediate callback with pre-set segments
        expect(mockUserContext.qualifiedSegments).toEqual(['seg-a']);
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

        onReadyDeferred.resolve(undefined);
        await flushPromises();

        // ODP not integrated — no background fetch, no second callback
        expect(client.isOdpIntegrated).toHaveBeenCalled();
        expect(mockUserContext.fetchQualifiedSegments).not.toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

        manager.dispose();
      });
    });

    describe('qualifiedSegments + skipSegments=false + no ODP manager', () => {
      it('should callback with pre-set segments immediately and skip background fetch without ODP manager', async () => {
        const { client, mockUserContext } = createMockClient({
          hasOdpManager: false,
          hasVuidManager: false,
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b']);
        await flushPromises();

        // Immediate callback with pre-set segments only — no ODP manager, no background fetch
        expect(mockUserContext.qualifiedSegments).toEqual(['seg-a', 'seg-b']);
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);
        expect(client.onReady).not.toHaveBeenCalled();
        expect(mockUserContext.fetchQualifiedSegments).not.toHaveBeenCalled();

        manager.dispose();
      });
    });

    describe('qualifiedSegments=[] empty array', () => {
      it('should treat empty array as explicit zero segments, callback immediately, then callback again after background fetch', async () => {
        const { client, mockUserContext, onReadyDeferred } = createMockClient({
          hasOdpManager: true,
          hasVuidManager: false,
          isOdpIntegrated: true,
        });
        // fetchQualifiedSegments returns segments (differ from empty)
        (mockUserContext.fetchQualifiedSegments as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          mockUserContext.qualifiedSegments = ['seg-x'];
          return true;
        });
        const config = createManagerConfig(client);
        const manager = new UserContextManager(config);

        manager.resolveUserContext({ id: 'user-1' }, []); // empty array is truthy in JS

        // Immediate callback with empty segments
        expect(mockUserContext.qualifiedSegments).toEqual([]);
        expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

        onReadyDeferred.resolve(undefined);
        await flushPromises();

        // Background fetch returned different segments — second callback fires
        expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();
        expect(config.onUserContextReady).toHaveBeenCalledTimes(2);

        manager.dispose();
      });
    });
  });

  // ============================================================
  // Race conditions
  // ============================================================
  describe('race conditions', () => {
    it('should only fire callback for the latest request when multiple calls are made', async () => {
      const { client, onReadyDeferred } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: true,
      });

      // The stale first call never reaches createUserContext, so only one
      // createUserContext call will happen (for the second request).
      const expectedCtx = { getUserId: vi.fn().mockReturnValue('vuid-2') } as unknown as OptimizelyUserContext;
      (client.createUserContext as ReturnType<typeof vi.fn>).mockReturnValue(expectedCtx);

      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      // First call — no userId, will wait for onReady
      manager.resolveUserContext();
      await flushPromises();

      // Second call — also no userId, should invalidate first
      manager.resolveUserContext();
      await flushPromises();

      // Resolve onReady — both resume, but first is stale
      onReadyDeferred.resolve(undefined);
      await flushPromises();

      // Only the second request's context should have been reported
      expect(client.createUserContext).toHaveBeenCalledTimes(1);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);
      expect(config.onUserContextReady).toHaveBeenCalledWith(expectedCtx);

      manager.dispose();
    });

    it('should abandon in-flight request when a new request with userId is made', async () => {
      const { client, onReadyDeferred } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: true,
      });

      // The sync userId call happens first (stale VUID call never reaches createUserContext).
      const syncCtx = { getUserId: vi.fn().mockReturnValue('user-1') } as unknown as OptimizelyUserContext;
      (client.createUserContext as ReturnType<typeof vi.fn>).mockReturnValue(syncCtx);

      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      // First call — no userId, will wait for onReady
      manager.resolveUserContext();
      await flushPromises();
      expect(client.onReady).toHaveBeenCalled();

      // Second call — has userId, completes synchronously
      manager.resolveUserContext({ id: 'user-1' });
      await flushPromises();

      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);
      expect(config.onUserContextReady).toHaveBeenCalledWith(syncCtx);

      // Now resolve onReady — first request should be stale
      onReadyDeferred.resolve(undefined);
      await flushPromises();

      // Still only one callback (stale request was abandoned)
      expect(client.createUserContext).toHaveBeenCalledTimes(1);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      manager.dispose();
    });

    it('should suppress background fetch callback of stale request when user changes after pre-set segments callback', async () => {
      const segmentDeferred = createDeferred<boolean>();
      const { client, mockUserContext, onReadyDeferred } = createMockClient({
        hasOdpManager: true,
        hasVuidManager: false,
        isOdpIntegrated: true,
      });
      (mockUserContext.fetchQualifiedSegments as ReturnType<typeof vi.fn>).mockReturnValue(segmentDeferred.promise);

      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      // First call with qualifiedSegments — pre-set segments callback fires immediately
      manager.resolveUserContext({ id: 'user-1' }, ['seg-a']);

      // Pre-set segments callback of first request fired
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      // Resolve onReady so background fetch starts
      onReadyDeferred.resolve(undefined);
      await flushPromises();

      expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();

      // New user call invalidates the first request
      const newCtx = {
        getUserId: vi.fn().mockReturnValue('user-2'),
        qualifiedSegments: null as string[] | null,
        fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
      } as unknown as OptimizelyUserContext;
      (client.createUserContext as ReturnType<typeof vi.fn>).mockReturnValue(newCtx);
      manager.resolveUserContext({ id: 'user-2' });
      await flushPromises();

      expect(config.onUserContextReady).toHaveBeenCalledTimes(2);

      // First request's background fetch completes — callback should be suppressed (stale)
      (mockUserContext as unknown as { qualifiedSegments: string[] }).qualifiedSegments = ['seg-a', 'seg-new'];
      segmentDeferred.resolve(true);

      await flushPromises();

      // Still only 2 calls — background fetch callback of stale request was suppressed
      expect(config.onUserContextReady).toHaveBeenCalledTimes(2);

      manager.dispose();
    });
  });

  // ============================================================
  // Dispose
  // ============================================================
  describe('dispose', () => {
    it('should prevent callbacks after dispose even when async operations complete', async () => {
      const { client, onReadyDeferred } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: true,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext(); // no userId, will await onReady
      await flushPromises();

      // Dispose before onReady resolves
      manager.dispose();

      // Resolve onReady after dispose
      onReadyDeferred.resolve(undefined);
      await flushPromises();

      expect(config.onUserContextReady).not.toHaveBeenCalled();
      expect(config.onError).not.toHaveBeenCalled();
    });

    it('should prevent callbacks on dispose before segment fetch completes', async () => {
      const segmentDeferred = createDeferred<boolean>();
      const { client, mockUserContext, onReadyDeferred } = createMockClient({
        hasOdpManager: true,
        hasVuidManager: false,
        isOdpIntegrated: true,
      });
      (mockUserContext.fetchQualifiedSegments as ReturnType<typeof vi.fn>).mockReturnValue(segmentDeferred.promise);
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1' });
      await flushPromises();

      // Resolve onReady so we get to segment fetch
      onReadyDeferred.resolve(undefined);
      await flushPromises();

      expect(mockUserContext.fetchQualifiedSegments).toHaveBeenCalled();
      expect(config.onUserContextReady).not.toHaveBeenCalled();

      // Dispose while segments are being fetched
      manager.dispose();

      // Segments complete after dispose
      segmentDeferred.resolve(true);
      await flushPromises();

      expect(config.onUserContextReady).not.toHaveBeenCalled();
    });

    it('should suppress error callbacks after dispose', async () => {
      const { client, onReadyDeferred } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: true,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext(); // no userId, will await onReady
      await flushPromises();

      manager.dispose();

      // onReady rejects after dispose
      onReadyDeferred.reject(new Error('init failed'));
      await flushPromises();

      expect(config.onError).not.toHaveBeenCalled();
      expect(config.onUserContextReady).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Error handling
  // ============================================================
  describe('error handling', () => {
    it('should call onError when onReady rejects', async () => {
      const { client, onReadyDeferred } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: true,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext();
      await flushPromises();

      onReadyDeferred.reject(new Error('SDK init failed'));
      await flushPromises();

      expect(config.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'SDK init failed' }));
      expect(config.onUserContextReady).not.toHaveBeenCalled();

      manager.dispose();
    });

    it('should wrap non-Error throws in an Error object', async () => {
      const { client, onReadyDeferred } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: true,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext();
      await flushPromises();

      onReadyDeferred.reject('string error');
      await flushPromises();

      expect(config.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'string error' }));

      manager.dispose();
    });
  });

  // ============================================================
  // Change detection (no-op short-circuit)
  // ============================================================
  describe('change detection', () => {
    it('should not recreate user context when called with same user and segments', async () => {
      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1', attributes: { plan: 'pro' } });

      expect(client.createUserContext).toHaveBeenCalledTimes(1);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      // Call again with value-equal user — should be a no-op
      manager.resolveUserContext({ id: 'user-1', attributes: { plan: 'pro' } });

      expect(client.createUserContext).toHaveBeenCalledTimes(1);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      manager.dispose();
    });

    it('should recreate user context when user id changes', async () => {
      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1' });
      expect(client.createUserContext).toHaveBeenCalledTimes(1);

      manager.resolveUserContext({ id: 'user-2' });
      expect(client.createUserContext).toHaveBeenCalledTimes(2);

      manager.dispose();
    });

    it('should recreate user context when user attributes change', async () => {
      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1', attributes: { plan: 'free' } });
      expect(client.createUserContext).toHaveBeenCalledTimes(1);

      manager.resolveUserContext({ id: 'user-1', attributes: { plan: 'pro' } });
      expect(client.createUserContext).toHaveBeenCalledTimes(2);

      manager.dispose();
    });

    it('should recreate user context when qualifiedSegments change', async () => {
      const mockUserContext = {
        getUserId: vi.fn().mockReturnValue('user-1'),
        qualifiedSegments: null as string[] | null,
        fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
      } as unknown as OptimizelyUserContext;

      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      (client.createUserContext as ReturnType<typeof vi.fn>).mockReturnValue(mockUserContext);
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1' }, ['seg-a']);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b']);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(2);

      manager.dispose();
    });

    it('should not recreate user context when qualifiedSegments are value-equal', async () => {
      const mockUserContext = {
        getUserId: vi.fn().mockReturnValue('user-1'),
        qualifiedSegments: null as string[] | null,
        fetchQualifiedSegments: vi.fn().mockResolvedValue(true),
      } as unknown as OptimizelyUserContext;

      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      (client.createUserContext as ReturnType<typeof vi.fn>).mockReturnValue(mockUserContext);
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b']);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      // New array reference, same values
      manager.resolveUserContext({ id: 'user-1' }, ['seg-a', 'seg-b']);
      expect(config.onUserContextReady).toHaveBeenCalledTimes(1);

      manager.dispose();
    });

    it('should recreate user context when skipSegments changes', async () => {
      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1' }, undefined, false);
      expect(client.createUserContext).toHaveBeenCalledTimes(1);

      manager.resolveUserContext({ id: 'user-1' }, undefined, true);
      expect(client.createUserContext).toHaveBeenCalledTimes(2);

      manager.dispose();
    });

    it('should not recreate when all of user, segments, and skipSegments are unchanged', async () => {
      const { client } = createMockClient({
        hasOdpManager: false,
        hasVuidManager: false,
      });
      const config = createManagerConfig(client);
      const manager = new UserContextManager(config);

      manager.resolveUserContext({ id: 'user-1' }, ['seg-a'], true);
      expect(client.createUserContext).toHaveBeenCalledTimes(1);

      manager.resolveUserContext({ id: 'user-1' }, ['seg-a'], true);
      expect(client.createUserContext).toHaveBeenCalledTimes(1);

      manager.dispose();
    });
  });
});
