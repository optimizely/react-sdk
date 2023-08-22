jest.mock('@optimizely/optimizely-sdk/dist/modules/logging', () => ({
  getLogger: jest.fn().mockReturnValue({ debug: jest.fn() }),
}));

import logOnlyEventDispatcher from './logOnlyEventDispatcher';
import * as logging from '@optimizely/optimizely-sdk/dist/modules/logging';

const logger = logging.getLogger('ReactSDK');

describe('logOnlyEventDispatcher', () => {
  it('logs a message', () => {
    const callback = jest.fn();
    logOnlyEventDispatcher.dispatchEvent({ url: 'https://localhost:8080', httpVerb: 'POST', params: {} }, callback);
    expect(callback).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });
});
