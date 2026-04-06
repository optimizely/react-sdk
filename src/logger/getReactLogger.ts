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

import type { Client } from '@optimizely/optimizely-sdk';
import { REACT_CLIENT_META } from '../client/createInstance';
import type { ReactClientMeta } from '../client/createInstance';
import { createReactLogger } from './ReactLogger';

/**
 * Returns the cached ReactLogger instance for the given client.
 * Creates it lazily on first call; subsequent calls return the same instance.
 * Returns undefined if the client has no logger config (e.g., logger was
 * not created via the React SDK's createLogger wrapper).
 */
export function getReactLogger(client: Client) {
  const meta = (client as unknown as Record<symbol, ReactClientMeta>)[REACT_CLIENT_META];

  if (meta.logger) return meta.logger;

  if (meta.loggerConfig) {
    meta.logger = createReactLogger(meta.loggerConfig);
    return meta.logger;
  }

  return undefined;
}
