jest.mock('@optimizely/js-sdk-logging', () => ({
  getLogger: jest.fn().mockReturnValue({ debug: jest.fn() }),
}));

import logOnlyEventDispatcher from './logOnlyEventDispatcher';
import * as logging from '@optimizely/js-sdk-logging';

const logger = logging.getLogger('ReactSDK');

describe('logOnlyEventDispatcher', () => {
  it('logs a message', () => {
    const callback = jest.fn();
    logOnlyEventDispatcher.dispatchEvent({ url: 'https://localhost:8080', httpVerb: 'POST', params: {} }, callback);
    expect(callback).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });
});
