/**
 * Copyright 2024 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as optimizely from '@optimizely/optimizely-sdk';
import { logger } from './logger';
import { sprintf } from './utils';

jest.mock('@optimizely/optimizely-sdk', () => ({
  getLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
  }),
  enums: {
    LOG_LEVEL: {
      WARNING: 'WARNING',
      INFO: 'INFO',
      DEBUG: 'DEBUG',
      ERROR: 'ERROR',
    },
  },
}));

describe('logger module', () => {
  const mockLogHandler = optimizely.getLogger('ReactSDK');
  const logSpy = mockLogHandler.log as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log a warning message', () => {
    const message = 'This is a warning: %s';
    const arg = 'something went wrong';

    logger.warn(message, arg);

    expect(logSpy).toHaveBeenCalledWith(optimizely.enums.LOG_LEVEL.WARNING, sprintf(message, arg));
  });

  it('should log an info message', () => {
    const message = 'This is an info: %s';
    const arg = 'all good';

    logger.info(message, arg);

    expect(logSpy).toHaveBeenCalledWith(optimizely.enums.LOG_LEVEL.INFO, sprintf(message, arg));
  });

  it('should log a debug message', () => {
    const message = 'Debugging: %s';
    const arg = 'checking details';

    logger.debug(message, arg);

    expect(logSpy).toHaveBeenCalledWith(optimizely.enums.LOG_LEVEL.DEBUG, sprintf(message, arg));
  });

  it('should log an error message', () => {
    const message = 'Error occurred: %s';
    const arg = 'critical failure';

    logger.error(message, arg);

    expect(logSpy).toHaveBeenCalledWith(optimizely.enums.LOG_LEVEL.ERROR, sprintf(message, arg));
  });
});
