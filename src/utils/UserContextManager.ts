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

import type { Client, OptimizelyUserContext } from '@optimizely/optimizely-sdk';
import { REACT_CLIENT_META } from '../client';
import type { ReactClientMeta } from '../client';
import type { UserInfo } from '../provider';
import { areSegmentsEqual, areUsersEqual } from './helpers';

export interface UserContextManagerConfig {
  client: Client;
  onUserContextReady: (ctx: OptimizelyUserContext) => void;
  onError: (error: Error) => void;
}

/**
 * Manages user context creation, VUID resolution, and ODP segment fetching.
 *
 * Handles async operations with staleness checks so that rapid user changes
 * only result in the latest request's callback being fired. Previous in-flight
 * operations are abandoned via a requestId counter.
 *
 * Internally tracks previous user, segments, and skipSegments values to
 * short-circuit when nothing has changed.
 */
export class UserContextManager {
  private readonly client: Client;
  private readonly onUserContextReady: (ctx: OptimizelyUserContext) => void;
  private readonly onError: (error: Error) => void;
  private readonly meta: ReactClientMeta;

  private requestId = 0;
  private disposed = false;
  private initialized = false;
  private skipSegments = false;
  private prevUser?: UserInfo;
  private prevSegments?: string[];

  constructor(config: UserContextManagerConfig) {
    this.client = config.client;
    this.onUserContextReady = config.onUserContextReady;
    this.onError = config.onError;

    this.meta = (this.client as unknown as Record<symbol, ReactClientMeta>)[REACT_CLIENT_META];
  }

  /**
   * Resolves whether user context needs to be (re)created based on
   * value-equality of user, qualifiedSegments, and skipSegments.
   * Short-circuits if nothing has changed since the previous call.
   *
   * @param user - Optional user info (id and attributes)
   * @param qualifiedSegments - Optional pre-fetched segments. When provided,
   * @param skipSegments - Whether to skip ODP segment fetching (default: false)
   */
  resolveUserContext(user?: UserInfo, qualifiedSegments?: string[], skipSegments = false): void {
    if (
      this.initialized &&
      this.skipSegments === skipSegments &&
      areUsersEqual(this.prevUser, user) &&
      areSegmentsEqual(this.prevSegments, qualifiedSegments)
    ) {
      return;
    }

    this.initialized = true;
    this.skipSegments = skipSegments;
    this.prevUser = user;
    this.prevSegments = qualifiedSegments;

    const requestId = ++this.requestId;

    this.createUserContext(requestId, user, qualifiedSegments).catch((error: unknown) => {
      if (this.isStale(requestId)) return;
      this.onError(error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * Disposes the manager, preventing any future callbacks from firing.
   */
  dispose(): void {
    this.disposed = true;
  }

  private async createUserContext(requestId: number, user?: UserInfo, qualifiedSegments?: string[]): Promise<void> {
    if (!user?.id && this.meta.hasVuidManager) {
      await this.client.onReady();
      if (this.isStale(requestId)) return;
    }

    const ctx = this.client.createUserContext(user?.id, user?.attributes);

    if (qualifiedSegments !== undefined) {
      ctx.qualifiedSegments = qualifiedSegments;

      this.onUserContextReady(ctx); // immediate callback for sync decision with pre-set segments

      if (this.skipSegments) return;

      // Background fetch — only when ODP manager exists
      if (this.meta.hasOdpManager) {
        await this.client.onReady();

        if (this.isStale(requestId)) return;

        if (this.client.isOdpIntegrated()) {
          const snapshot = [...qualifiedSegments];

          await ctx.fetchQualifiedSegments();

          if (this.isStale(requestId)) return;

          // update only if different
          if (!areSegmentsEqual(snapshot, ctx.qualifiedSegments)) {
            this.onUserContextReady(ctx);
          }
        }
      }
      return;
    }

    //  odpManager and no qualifiedSegments
    if (!this.skipSegments && this.meta.hasOdpManager) {
      await this.client.onReady();
      if (this.isStale(requestId)) return;

      if (this.client.isOdpIntegrated()) {
        await ctx.fetchQualifiedSegments();
        if (this.isStale(requestId)) return;
      }
    }

    this.onUserContextReady(ctx);
  }

  private isStale(requestId: number): boolean {
    return this.disposed || requestId !== this.requestId;
  }
}
