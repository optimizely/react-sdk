/**
 * Copyright 2019-2020, Optimizely
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
import clientStore, { Observable, iStoreState } from './notifier';

describe('store', () => {
  const store = clientStore.getInstance();

  it('should be defined', () => {
    expect(clientStore).toBeDefined();
  });

  it('should be an instance of Observable', () => {
    expect(store).toBeInstanceOf(Observable);
  });

  it('should have a subscribe method', () => {
    expect(store.subscribe).toBeDefined();
  });

  it('should have an unsubscribe method', () => {
    expect(store.unsubscribe).toBeDefined();
  });

  it('should have an updateStore method', () => {
    expect(store.updateStore).toBeDefined();
  });

  it('should have a setState method', () => {
    expect(store.setState).toBeDefined();
  });

  it('should have a notify method', () => {
    expect(store.notify).toBeDefined();
  });

  describe('when multiple instances', () => {
    const store2 = clientStore.getInstance();
    const store3 = clientStore.getInstance();

    it('all instances should point to the same reference', () => {
      expect(store).toBe(store2);
      expect(store).toBe(store3);
      expect(store2).toBe(store3);
    });
  });

  describe('when subscribing', () => {
    let callback: jest.MockedFunction<() => void>;

    beforeEach(() => {
      callback = jest.fn();
      store.subscribe(callback);
    });

    describe('when updating the store', () => {
      let updatedState: iStoreState;

      beforeEach(() => {
        updatedState = {
          lastUserUpdate: new Date(),
        };

        store.setState(updatedState);
      });

      it('should call the callback', () => {
        expect(callback).toHaveBeenCalledWith(updatedState, { lastUserUpdate: null });
      });
    });

    describe('when unsubscribing', () => {
      beforeEach(() => {
        store.unsubscribe(callback);
      });

      describe('when updating the store', () => {
        let updatedState: iStoreState;

        beforeEach(() => {
          updatedState = {
            lastUserUpdate: new Date(),
          };

          store.setState(updatedState);
        });

        it('should not call the callback', () => {
          expect(callback).not.toHaveBeenCalled();
        });
      });
    });
  });
});
