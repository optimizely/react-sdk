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

import { createLogger as jsCreateLogger, LogLevel, DEBUG, INFO, WARN, ERROR } from '@optimizely/optimizely-sdk';
import type { LoggerConfig, OpaqueLevelPreset } from '@optimizely/optimizely-sdk';
import { createReactLogger } from './ReactLogger';
import type { ReactLogger } from './ReactLogger';

let reactLogger: ReactLogger | undefined;

function resolveLogLevel(preset: OpaqueLevelPreset): LogLevel {
  if (preset === DEBUG) return LogLevel.Debug;
  if (preset === INFO) return LogLevel.Info;
  if (preset === WARN) return LogLevel.Warn;
  if (preset === ERROR) return LogLevel.Error;
  return LogLevel.Error;
}

export function createLogger(config: LoggerConfig) {
  const opaqueLogger = jsCreateLogger(config);

  reactLogger = createReactLogger({
    logLevel: resolveLogLevel(config.level),
    logHandler: config.logHandler,
  });

  return opaqueLogger;
}

export function getReactLogger(): ReactLogger | undefined {
  return reactLogger;
}
