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

import type { ReactNode } from 'react';
import type { Client as OptimizelyClient, OptimizelyUserContext, UserAttributes } from '@optimizely/optimizely-sdk';
import { ProviderStateStore } from './ProviderStateStore';

/**
 * User information passed to the Provider or hooks for user override.
 */
export interface UserInfo {
  id?: string;
  attributes?: UserAttributes;
}

/**
 * Props for the OptimizelyProvider component.
 */
export interface OptimizelyProviderProps {
  /**
   * The Optimizely client instance.
   */
  client: OptimizelyClient;

  /**
   * User information for decisions.
   */
  user?: UserInfo;

  /**
   * Timeout in milliseconds to wait for the client to become ready.
   *  @default 30000 - 30 seconds
   */
  timeout?: number;

  /**
   * Skip fetching ODP segments for the user context.
   * @default false
   */
  skipSegments?: boolean;

  /**
   * React children to render.
   */
  children?: ReactNode;
}

/**
 * Internal state managed by the ProviderStateStore.
 * This is the reactive state that hooks subscribe to.
 */
export interface ProviderState {
  /**
   * Whether js onReady() is resolved.
   */
  isClientReady: boolean;

  /**
   * The current user context for making decisions.
   * null while initializing or if user creation failed.
   */
  userContext: OptimizelyUserContext | null;

  /**
   * Error that occurred during initialization or user context creation.
   */
  error: Error | null;
}

/**
 * The value provided via React Context.
 * Contains stable references to the store and client.
 * Hooks subscribe directly to the store for state changes.
 */
export interface OptimizelyContextValue {
  /**
   * The state store - hooks subscribe to this for reactive updates.
   */
  store: ProviderStateStore;

  /**
   * The Optimizely client instance.
   */
  client: OptimizelyClient;
}
