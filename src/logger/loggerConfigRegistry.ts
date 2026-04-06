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

import type { ReactLoggerConfig } from './ReactLogger';

// WeakMap keyed by OpaqueLogger objects. Bridges the gap between
// createLogger() and createInstance() — supports multiple clients with
// different configs and automatically releases entries when the logger is GC'd.
const registry = new WeakMap<object, ReactLoggerConfig>();

export function storeLoggerConfig(logger: object, config: ReactLoggerConfig): void {
  registry.set(logger, config);
}

export function getLoggerConfig(logger: object): ReactLoggerConfig | undefined {
  return registry.get(logger);
}
