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

import { createInstance as jsCreateInstance, CacheWithRemove } from '@optimizely/optimizely-sdk';

import type {
  OpaqueConfigManager,
  OpaqueEventProcessor,
  OpaqueOdpManager,
  OpaqueVuidManager,
  OpaqueLogger,
  OpaqueErrorNotifier,
  UserProfileService,
  Client as OptimizelyClient,
  OptimizelyDecideOption,
} from '@optimizely/optimizely-sdk';

export interface ReactClientConfig {
  projectConfigManager: OpaqueConfigManager;
  eventProcessor?: OpaqueEventProcessor;
  odpManager?: OpaqueOdpManager;
  vuidManager?: OpaqueVuidManager;
  logger?: OpaqueLogger;
  errorNotifier?: OpaqueErrorNotifier;
  userProfileService?: UserProfileService;
  defaultDecideOptions?: OptimizelyDecideOption[];
  jsonSchemaValidator?: { validate(jsonObject: unknown): boolean };
  disposable?: boolean;
  cmab?: {
    cacheSize?: number;
    cacheTtl?: number;
    cache?: CacheWithRemove<string>;
    predictionEndpointTemplate?: string;
  };
}

/**
 * Creates an Optimizely client instance for use with React SDK.
 * This is a lightweight wrapper around the JS SDK v6 createInstance.
 *
 * @param config - Configuration object for the Optimizely client
 * @returns An OptimizelyClient instance
 */
export function createInstance(config: ReactClientConfig): OptimizelyClient {
  return jsCreateInstance(config);
}
