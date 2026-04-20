/**
 * Copyright 2018-2019, 2023, 2024, 2026 Optimizely
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

export {
  createInstance,
  createPollingProjectConfigManager,
  createStaticProjectConfigManager,
  createBatchEventProcessor,
  createForwardingEventProcessor,
  createOdpManager,
  createVuidManager,
  createErrorNotifier,
  OptimizelyDecideOption,
  LogLevel,
  NOTIFICATION_TYPES,
  DECISION_NOTIFICATION_TYPES,
  DECISION_SOURCES,
  eventDispatcher,
  getSendBeaconEventDispatcher,
} from './client';
export { createLogger, DEBUG, ERROR, WARN, INFO } from './logger';

export type * from '@optimizely/optimizely-sdk';

// Provider
export { OptimizelyProvider } from './provider';
export type { UserInfo, OptimizelyProviderProps } from './provider';

// Hooks
export {
  useOptimizelyUserContext,
  useOptimizelyClient,
  useDecide,
  useDecideForKeys,
  useDecideAll,
  useDecideAsync,
  useDecideForKeysAsync,
  useDecideAllAsync,
} from './hooks';

// Helpers
export { getQualifiedSegments, type QualifiedSegmentsResult } from './utils';
