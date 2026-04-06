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
import { storeLoggerConfig, getLoggerConfig } from './loggerConfigRegistry';
import { createReactLogger } from './ReactLogger';
import type { ReactLoggerConfig } from './ReactLogger';

const mockOpaqueLogger = vi.hoisted(() => ({ __opaque: true }));

vi.mock('@optimizely/optimizely-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof import('@optimizely/optimizely-sdk')>();
  return {
    ...original,
    createLogger: vi.fn().mockReturnValue(mockOpaqueLogger),
  };
});

import { createLogger } from './createLogger';

describe('createLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the opaque logger from the JS SDK', () => {
    const config: LoggerConfig = { level: INFO };
    const result = createLogger(config);
    expect(result).toBe(mockOpaqueLogger);
  });

  it('should store the resolved config in the registry', () => {
    const mockHandler: LogHandler = { log: vi.fn() };
    createLogger({ level: INFO, logHandler: mockHandler });

    const storedConfig = getLoggerConfig(mockOpaqueLogger);
    expect(storedConfig).toBeDefined();
    expect(storedConfig!.logLevel).toBe(LogLevel.Info);
    expect(storedConfig!.logHandler).toBe(mockHandler);
  });

  describe('log level resolution', () => {
    it.each([
      { preset: DEBUG, expected: LogLevel.Debug, name: 'DEBUG' },
      { preset: INFO, expected: LogLevel.Info, name: 'INFO' },
      { preset: WARN, expected: LogLevel.Warn, name: 'WARN' },
      { preset: ERROR, expected: LogLevel.Error, name: 'ERROR' },
    ])('should resolve $name preset to LogLevel.$name', ({ preset, expected }) => {
      createLogger({ level: preset });
      const storedConfig = getLoggerConfig(mockOpaqueLogger);
      expect(storedConfig!.logLevel).toBe(expected);
    });
  });
});

describe('loggerConfigRegistry', () => {
  it('should return undefined for unknown logger objects', () => {
    expect(getLoggerConfig({})).toBeUndefined();
  });

  it('should store and retrieve config for a given logger', () => {
    const logger = {};
    const config: ReactLoggerConfig = { logLevel: LogLevel.Warn };
    storeLoggerConfig(logger, config);
    expect(getLoggerConfig(logger)).toBe(config);
  });

  it('should support multiple loggers with different configs', () => {
    const logger1 = {};
    const logger2 = {};
    const config1: ReactLoggerConfig = { logLevel: LogLevel.Debug };
    const config2: ReactLoggerConfig = { logLevel: LogLevel.Error };

    storeLoggerConfig(logger1, config1);
    storeLoggerConfig(logger2, config2);

    expect(getLoggerConfig(logger1)).toBe(config1);
    expect(getLoggerConfig(logger2)).toBe(config2);
  });
});

describe('createReactLogger', () => {
  describe('log level filtering', () => {
    it('should filter messages below the configured level', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Warn, logHandler: mockHandler });

      logger.debug('should not appear');
      logger.info('should not appear');
      logger.warn('should appear');
      logger.error('should appear');

      expect(mockHandler.log).toHaveBeenCalledTimes(2);
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Warn, '[ReactSDK] should appear');
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Error, '[ReactSDK] should appear');
    });

    it('should allow all messages when level is Debug', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Debug, logHandler: mockHandler });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(mockHandler.log).toHaveBeenCalledTimes(4);
    });

    it('should only allow error messages when level is Error', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Error, logHandler: mockHandler });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(mockHandler.log).toHaveBeenCalledTimes(1);
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Error, '[ReactSDK] e');
    });
  });

  describe('log handler', () => {
    it('should use the provided logHandler', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Info, logHandler: mockHandler });

      logger.info('hello');

      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Info, '[ReactSDK] hello');
    });

    it('should use default console handler when logHandler is not provided', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = createReactLogger({ logLevel: LogLevel.Info });

      logger.info('hello');

      expect(consoleSpy).toHaveBeenCalledWith('[ReactSDK] hello');
      consoleSpy.mockRestore();
    });
  });

  describe('message prefix', () => {
    it('should prepend [ReactSDK] to all messages', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Debug, logHandler: mockHandler });

      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      for (const call of (mockHandler.log as ReturnType<typeof vi.fn>).mock.calls) {
        expect(call[1]).toMatch(/^\[ReactSDK\] /);
      }
    });
  });
});
