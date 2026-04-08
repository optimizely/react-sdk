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
import type { LogHandler } from '@optimizely/optimizely-sdk';
import { createReactLogger } from './ReactLogger';
import type { ReactLogger } from './ReactLogger';

const mockOpaqueLogger = vi.hoisted(() => ({ __opaque: true }));

vi.mock('@optimizely/optimizely-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof import('@optimizely/optimizely-sdk')>();
  return {
    ...original,
    createLogger: vi.fn().mockReturnValue(mockOpaqueLogger),
  };
});

import { createLogger, REACT_LOGGER } from './createLogger';

describe('createLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the opaque logger from the JS SDK', () => {
    const result = createLogger({ level: INFO });
    expect(result).toBe(mockOpaqueLogger);
  });

  it('should attach a ReactLogger via the REACT_LOGGER symbol', () => {
    const mockHandler: LogHandler = { log: vi.fn() };
    const result = createLogger({ level: INFO, logHandler: mockHandler });

    const reactLogger = (result as Record<symbol, unknown>)[REACT_LOGGER] as ReactLogger;
    expect(reactLogger).toBeDefined();
    expect(reactLogger.debug).toBeTypeOf('function');
    expect(reactLogger.info).toBeTypeOf('function');
    expect(reactLogger.warn).toBeTypeOf('function');
    expect(reactLogger.error).toBeTypeOf('function');
  });

  it('should create a ReactLogger that uses the provided logHandler', () => {
    const mockHandler: LogHandler = { log: vi.fn() };
    const result = createLogger({ level: INFO, logHandler: mockHandler });

    const reactLogger = (result as Record<symbol, unknown>)[REACT_LOGGER] as ReactLogger;
    reactLogger.info('hello');

    expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Info, '[OPTIMIZELY - REACT] - INFO hello');
  });

  describe('log level resolution', () => {
    it.each([
      { preset: DEBUG, expectedCalls: 4, name: 'DEBUG' },
      { preset: INFO, expectedCalls: 3, name: 'INFO' },
      { preset: WARN, expectedCalls: 2, name: 'WARN' },
      { preset: ERROR, expectedCalls: 1, name: 'ERROR' },
    ])('should resolve $name preset correctly', ({ preset, expectedCalls }) => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const result = createLogger({ level: preset, logHandler: mockHandler });

      const reactLogger = (result as Record<symbol, unknown>)[REACT_LOGGER] as ReactLogger;
      reactLogger.debug('d');
      reactLogger.info('i');
      reactLogger.warn('w');
      reactLogger.error('e');
      expect(mockHandler.log).toHaveBeenCalledTimes(expectedCalls);
    });
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
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Warn, '[OPTIMIZELY - REACT] - WARN should appear');
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Error, '[OPTIMIZELY - REACT] - ERROR should appear');
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
      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Error, '[OPTIMIZELY - REACT] - ERROR e');
    });
  });

  describe('log handler', () => {
    it('should use the provided logHandler', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Info, logHandler: mockHandler });

      logger.info('hello');

      expect(mockHandler.log).toHaveBeenCalledWith(LogLevel.Info, '[OPTIMIZELY - REACT] - INFO hello');
    });

    it('should use default console handler when logHandler is not provided', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = createReactLogger({ logLevel: LogLevel.Info });

      logger.info('hello');

      expect(consoleSpy).toHaveBeenCalledWith('[OPTIMIZELY - REACT] - INFO hello');
      consoleSpy.mockRestore();
    });
  });

  describe('message prefix', () => {
    it('should prepend [OPTIMIZELY - REACT] to all messages', () => {
      const mockHandler: LogHandler = { log: vi.fn() };
      const logger = createReactLogger({ logLevel: LogLevel.Debug, logHandler: mockHandler });

      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      for (const call of (mockHandler.log as ReturnType<typeof vi.fn>).mock.calls) {
        expect(call[1]).toMatch(/^\[OPTIMIZELY - REACT\] - (DEBUG|INFO|WARN|ERROR) /);
      }
    });
  });
});
