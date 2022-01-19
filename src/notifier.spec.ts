/**
 * Copyright 2019-2022, Optimizely
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
import { notifier } from './notifier';

describe('notifier', () => {
  it('should have a subscribe method defined', () => {
    expect(notifier.subscribe).toBeDefined();
  });

  it('should have a notify method defined', () => {
    expect(notifier.notify).toBeDefined();
  });

  describe('Subscribing single key', () => {
    let callback: jest.MockedFunction<() => void>;
    const key: string = 'key_1';

    beforeEach(() => {
      callback = jest.fn();
      notifier.subscribe(key, callback);
    });

    describe('when notify event envoked with the relevent key', () => {
      beforeEach(() => {
        notifier.notify(key);
      });

      it('should call the callback', () => {
        expect(callback).toHaveBeenCalled();
      });

      it('should call the callback once only', () => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    describe('when notify event envoked with the irrelevant key', () => {
      beforeEach(() => {
        notifier.notify('another_key');
      });

      it('should not call the callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Subscribing multiple key', () => {
    let callback1: jest.MockedFunction<() => void>;
    const key1: string = 'key_1';
    let callback2: jest.MockedFunction<() => void>;
    const key2: string = 'key_2';

    beforeEach(() => {
      callback1 = jest.fn();
      callback2 = jest.fn();
      notifier.subscribe(key1, callback1);
      notifier.subscribe(key2, callback2);
    });

    describe('notifing particular key', () => {
      beforeEach(() => {
        notifier.notify(key1);
      });

      it('should call the callback of key 1 only', () => {
        expect(callback1).toHaveBeenCalledTimes(1);
      });

      it('should not call the callback of key 2', () => {
        expect(callback2).not.toHaveBeenCalled();
      });
    });
  });

  describe('Subscribing similar key with multiple instances', () => {
    let callback1: jest.MockedFunction<() => void>;
    const sameKey1: string = 'key_1';
    let callback2: jest.MockedFunction<() => void>;
    const sameKey2: string = 'key_1';

    beforeEach(() => {
      callback1 = jest.fn();
      callback2 = jest.fn();
      notifier.subscribe(sameKey1, callback1);
      notifier.subscribe(sameKey2, callback2);
    });
    describe('when notifing the key', () => {
      beforeEach(() => {
        notifier.notify(sameKey1);
      });

      it('should call all the callbacks of particular key', () => {
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('unsubscribing the key', () => {
    let callback: jest.MockedFunction<() => void>;
    const key: string = 'key_1';

    beforeEach(() => {
      callback = jest.fn();
    });
    describe('subscribe should return a function', () => {
      it('should call the callback', () => {
        const unsubscribe = notifier.subscribe(key, callback);
        expect(unsubscribe).toBeInstanceOf(Function);
      });
    });

    describe('should not envoke callback on notify if is unsubscribed', () => {
      beforeEach(() => {
        const unsubscribe = notifier.subscribe(key, callback);
        unsubscribe();
        notifier.notify(key);
      });

      it('should not call the callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
});
