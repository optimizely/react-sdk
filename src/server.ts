/**
 * Copyright 2026 Optimizely
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

/**
 * Server-safe entry point for @optimizely/react-sdk.
 *
 * This module can be safely imported in React Server Components (RSC)
 * as it does not use any client-only React APIs (createContext, hooks, etc.).
 */

// Client creation
export {
  createInstance,
  createPollingProjectConfigManager,
  createStaticProjectConfigManager,
  createBatchEventProcessor,
  createForwardingEventProcessor,
  createOdpManager,
  createVuidManager,
  createErrorNotifier,
} from './client/index';

// Logger
export { createLogger, DEBUG, ERROR, WARN, INFO } from './logger/index';

// Helpers
export { getQualifiedSegments, type QualifiedSegmentsResult } from './utils/helpers';

// Types from JS SDK
export type * from '@optimizely/optimizely-sdk';
