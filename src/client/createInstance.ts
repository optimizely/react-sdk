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

import { createInstance as jsCreateInstance } from '@optimizely/optimizely-sdk';
import type { Config, Client } from '@optimizely/optimizely-sdk';
import { REACT_LOGGER } from '../logger/createLogger';
import type { ReactLogger } from '../logger/ReactLogger';

export const CLIENT_ENGINE = 'react-sdk';
export const CLIENT_VERSION = '4.3.1';

export interface ReactClientMeta {
  hasOdpManager: boolean;
  hasVuidManager: boolean;
  logger?: ReactLogger;
}

/**
 * React-specific metadata, keyed by JS SDK client instance.
 *
 * Kept outside the client so the JS SDK instance is returned untouched
 * (no wrapper, no extra properties). Entries are collected with the client.
 */
const reactClientMeta = new WeakMap<Client, ReactClientMeta>();

/**
 * Returns the React SDK metadata for a client.
 *
 * Note: returns undefined at runtime if the client was not created via the
 * React SDK's createInstance. Typed as non-optional to preserve the existing
 * behavior of callers, which assume the meta is present.
 */
export function getReactClientMeta(client: Client): ReactClientMeta {
  return reactClientMeta.get(client) as ReactClientMeta;
}

/**
 * Associates React SDK metadata with a client. Internal; exported for
 * createInstance and test setup.
 */
export function setReactClientMeta(client: Client, meta: ReactClientMeta): void {
  reactClientMeta.set(client, meta);
}

/**
 * Creates an Optimizely client instance for use with React SDK.
 *
 * Returns the JS SDK client instance itself. React-specific metadata is
 * stored separately (see getReactClientMeta) rather than on a wrapper object:
 * the JS client mutates its own state via `this`, so a prototype-delegating
 * wrapper would split that state between the wrapper and the real instance.
 *
 * @param config - Configuration object for the Optimizely client
 * @returns The JS SDK client instance, registered with React SDK metadata
 */
export function createInstance(config: Config): Client {
  let reactLogger: ReactLogger | undefined;

  if (config.logger) {
    reactLogger = (config.logger as Record<symbol, unknown>)[REACT_LOGGER] as ReactLogger | undefined;
    delete (config.logger as Record<symbol, unknown>)[REACT_LOGGER];
  }

  const jsClient = jsCreateInstance({
    ...config,
    clientEngine: CLIENT_ENGINE,
    clientVersion: CLIENT_VERSION,
  });

  setReactClientMeta(jsClient, {
    hasOdpManager: !!config.odpManager,
    hasVuidManager: !!config.vuidManager,
    logger: reactLogger,
  });

  return jsClient;
}
