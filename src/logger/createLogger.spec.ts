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

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DEBUG, INFO, WARN, ERROR, LogLevel } from '@optimizely/optimizely-sdk';
import type { LoggerConfig, LogHandler } from '@optimizely/optimizely-sdk';

const mockOpaqueLogger = vi.hoisted(() => ({ __opaque: true }));

vi.mock('@optimizely/optimizely-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof import('@optimizely/optimizely-sdk')>();
  return {
    ...original,
    createLogger: vi.fn().mockReturnValue(mockOpaqueLogger),
  };
});

import { createLogger, getReactLogger } from './createLogger';

describe('createLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the opaque logger from the JS SDK', () => {
    const config: LoggerConfig = { level: INFO };
    const result = createLogger(config);
    expect(result).toBe(mockOpaqueLogger);
  });

  it('should make the ReactLogger available via getReactLogger', () => {
    const config: LoggerConfig = { level: INFO };
    createLogger(config);

    const reactLogger = getReactLogger();
    expect(reactLogger).toBeDefined();
    expect(typeof reactLogger!.debug).toBe('function');
    expect(typeof reactLogger!.info).toBe('function');
    expect(typeof reactLogger!.warn).toBe('function');
    expect(typeof reactLogger!.error).toBe('function');
  });

  describe('log level filtering', () => {
    it('should filter messages below the configured level', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      createLogger({ level: WARN, logHandler: mockHandler });

      const logger = getReactLogger()!;
      logger.debug('should not appear');
      logger.info('should not appear');
      logger.warn('should appear');
      logger.error('should appear');

      expect(mockHandler.log).toHaveBeenCalledTimes(2);
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Warn, '[ReactSDK] should appear');
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Error, '[ReactSDK] should appear');
    });

    it('should allow all messages when level is DEBUG', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      createLogger({ level: DEBUG, logHandler: mockHandler });

      const logger = getReactLogger()!;
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(mockHandler.log).toHaveBeenCalledTimes(4);
    });

    it('should only allow error messages when level is ERROR', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      createLogger({ level: ERROR, logHandler: mockHandler });

      const logger = getReactLogger()!;
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(mockHandler.log).toHaveBeenCalledTimes(1);
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Error, '[ReactSDK] e');
    });
  });

  describe('custom log handler', () => {
    it('should use the provided logHandler', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      createLogger({ level: INFO, logHandler: mockHandler });

      const logger = getReactLogger()!;
      logger.info('hello');

      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Info, '[ReactSDK] hello');
    });

    it('should use default console handler when logHandler is not provided', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      createLogger({ level: INFO });

      const logger = getReactLogger()!;
      logger.info('hello');

      expect(consoleSpy).toHaveBeenCalledWith('[ReactSDK] hello');
      consoleSpy.mockRestore();
    });
  });
});
