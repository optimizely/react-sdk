/**
 * Copyright 2023, Optimizely
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

jest.mock('@optimizely/optimizely-sdk', () => ({
  getLogger: jest.fn().mockReturnValue({ debug: jest.fn() }),
}));

import logOnlyEventDispatcher from './logOnlyEventDispatcher';
import { getLogger } from '@optimizely/optimizely-sdk';

const logger = getLogger('ReactSDK');

describe('logOnlyEventDispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a message', () => {
    const callback = jest.fn();
    const mockEvent = { url: 'https://localhost:8080', httpVerb: 'POST' as const, params: {} };
    logOnlyEventDispatcher.dispatchEvent(mockEvent, callback);
    const secondArgFunction = (logger.debug as jest.Mock).mock.calls[0][1];
    const result = secondArgFunction();

    expect(callback).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
    expect(result).toBe(JSON.stringify(mockEvent));
  });

  it('debugger log print error stringifying event', () => {
    const callback = jest.fn();
    // circular reference to force JSON.stringify to throw an error
    const circularReference: any = {};
    circularReference.self = circularReference;
    logOnlyEventDispatcher.dispatchEvent(circularReference, callback);
    const secondArgFunction = (logger.debug as jest.Mock).mock.calls[0][1];
    const result = secondArgFunction();

    expect(typeof secondArgFunction).toBe('function');
    expect(result).toBe('error stringifying event');
  });
});
