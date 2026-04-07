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

import { LogLevel } from '@optimizely/optimizely-sdk';
import type { LogHandler } from '@optimizely/optimizely-sdk';

export interface ReactLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface ReactLoggerConfig {
  logLevel: LogLevel;
  logHandler?: LogHandler;
}

const LOG_PREFIX = '[OPTIMIZELY - REACT]';
const defaultLogHandler: LogHandler = {
  log(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.Debug:
        console.debug(message);
        break;
      case LogLevel.Info:
        console.info(message);
        break;
      case LogLevel.Warn:
        console.warn(message);
        break;
      case LogLevel.Error:
        console.error(message);
        break;
    }
  },
};

export function createReactLogger(config: ReactLoggerConfig): ReactLogger {
  const handler = config.logHandler ?? defaultLogHandler;
  const level = config.logLevel;

  return {
    debug: (msg) => {
      if (level <= LogLevel.Debug) handler.log(LogLevel.Debug, `${LOG_PREFIX} - DEBUG ${msg}`);
    },
    info: (msg) => {
      if (level <= LogLevel.Info) handler.log(LogLevel.Info, `${LOG_PREFIX} - INFO ${msg}`);
    },
    warn: (msg) => {
      if (level <= LogLevel.Warn) handler.log(LogLevel.Warn, `${LOG_PREFIX} - WARN ${msg}`);
    },
    error: (msg) => {
      if (level <= LogLevel.Error) handler.log(LogLevel.Error, `${LOG_PREFIX} - ERROR ${msg}`);
    },
  };
}
