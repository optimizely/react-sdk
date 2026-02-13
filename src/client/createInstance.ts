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

export const CLIENT_ENGINE = 'react-sdk';
export const CLIENT_VERSION = '4.0.0';

export const REACT_CLIENT_META = Symbol('react-client-meta');

export interface ReactClientMeta {
  hasOdpManager: boolean;
  isVuidEnabled: boolean;
}

/**
 * Creates an Optimizely client instance for use with React SDK.
 *
 * Uses prototype delegation so the returned object inherits all methods
 * from the JS SDK client while carrying React-specific metadata.
 *
 * @param config - Configuration object for the Optimizely client
 * @returns An OptimizelyClient instance with React SDK metadata
 */
export function createInstance(config: Config): Client {
  const jsClient = jsCreateInstance({
    ...config,
    clientEngine: CLIENT_ENGINE,
    clientVersion: CLIENT_VERSION,
  });

  const reactClient = Object.create(jsClient);

  reactClient[REACT_CLIENT_META] = {
    hasOdpManager: !!config.odpManager,
    isVuidEnabled: !!config.vuidManager,
  } satisfies ReactClientMeta;

  return reactClient;
}
