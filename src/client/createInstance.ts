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

const CLIENT_ENGINE = 'react-sdk';
const CLIENT_VERSION = '4.0.0';

/**
 * Configuration for creating a React Optimizely client.
 * Extends JS SDK Config but excludes clientEngine and clientVersion
 * which are set internally by the React SDK.
 */
export type ReactClientConfig = Omit<Config, 'clientEngine' | 'clientVersion'>;

/**
 * Creates an Optimizely client instance for use with React SDK.
 *
 * @param config - Configuration object for the Optimizely client
 * @returns An OptimizelyClient instance
 */
export function createInstance(config: ReactClientConfig): Client {
  return jsCreateInstance({
    ...config,
    clientEngine: CLIENT_ENGINE,
    clientVersion: CLIENT_VERSION,
  });
}
