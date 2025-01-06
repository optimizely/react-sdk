/**
 * Copyright 2019-2024, Optimizely
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

jest.mock('@optimizely/optimizely-sdk');
jest.mock('./logger', () => {
  return {
    logger: {
      warn: jest.fn(() => () => {}),
      info: jest.fn(() => () => {}),
      error: jest.fn(() => () => {}),
      debug: jest.fn(() => () => {}),
    },
  };
});

import * as optimizely from '@optimizely/optimizely-sdk';

import { createInstance, DefaultUser, NotReadyReason, OnReadyResult, ReactSDKClient } from './client';
import { logger } from './logger';

interface MockedReactSDKClient extends ReactSDKClient {
  client: optimizely.Client;
  initialConfig: optimizely.Config;
}

describe('ReactSDKClient', () => {
  const validVuid = 'vuid_8de3bb278fce47f6b000cadc1ac';
  const userId = 'user1';
  const userAttributes = {
    foo: 'bar',
  };

  const config: optimizely.Config = {
    datafile: {},
  };

  let mockInnerClient: optimizely.Client;
  let mockOptimizelyUserContext: optimizely.OptimizelyUserContext;
  let createInstanceSpy: jest.Mock<optimizely.Client, [optimizely.Config]>;
  let instance: ReactSDKClient;
  const setupUserContext = async () => {
    jest.spyOn(mockOptimizelyUserContext, 'getUserId').mockReturnValue(userId);
    instance = createInstance(config);
    await instance.setUser({
      id: userId,
      attributes: userAttributes,
    });
  };

  beforeEach(() => {
    mockOptimizelyUserContext = {
      decide: jest.fn(),
      decideAll: jest.fn(),
      decideForKeys: jest.fn(),
      fetchQualifiedSegments: jest.fn(),
      getUserId: jest.fn(),
      getAttributes: jest.fn(),
      setForcedDecision: jest.fn(),
      getForcedDecision: jest.fn(),
      removeForcedDecision: jest.fn(),
      removeAllForcedDecisions: jest.fn(),
    } as any;

    mockInnerClient = {
      createUserContext: jest.fn(() => mockOptimizelyUserContext),
      activate: jest.fn(() => null),
      track: jest.fn(),
      isFeatureEnabled: jest.fn(() => false),
      getEnabledFeatures: jest.fn(() => []),
      getVariation: jest.fn(() => null),
      setForcedVariation: jest.fn(() => false),
      getForcedVariation: jest.fn(() => null),
      getFeatureVariableBoolean: jest.fn(() => null),
      getFeatureVariableDouble: jest.fn(() => null),
      getFeatureVariableJSON: jest.fn(() => null),
      getAllFeatureVariables: jest.fn(() => {
        return {};
      }),
      getFeatureVariable: jest.fn(() => null),
      getFeatureVariableInteger: jest.fn(() => null),
      getFeatureVariableString: jest.fn(() => null),
      getOptimizelyConfig: jest.fn(() => null),
      getProjectConfig: jest.fn(() => null),
      isOdpIntegrated: jest.fn(() => true),
      onReady: jest.fn(() => Promise.resolve({ success: false })),
      close: jest.fn(),
      getVuid: jest.fn(),
      sendOdpEvent: jest.fn(),
      notificationCenter: {
        addNotificationListener: jest.fn(() => 0),
        removeNotificationListener: jest.fn(() => false),
        clearNotificationListeners: jest.fn(),
        clearAllNotificationListeners: jest.fn(),
      },
    };

    const anyOptly = optimizely as any;
    anyOptly.createInstance.mockReturnValue(mockInnerClient);
    createInstanceSpy = optimizely.createInstance as jest.Mock<optimizely.Client, [optimizely.Config]>;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('client', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if inner client returns null, client is null', () => {
      (optimizely.createInstance as jest.Mock).mockReturnValue(null);
      // @ts-ignore
      instance._client = null;

      expect(instance.client).toBe(null);
    });

    it('returns the underlying client', () => {
      instance = createInstance(config);

      expect(instance.client).toBe(mockInnerClient);
    });
  });

  describe('createInstance', () => {
    it('if inner client returns null, client and user ready promise resolves with success: false', async () => {
      (optimizely.createInstance as jest.Mock).mockReturnValue(null);
      instance = createInstance(config);
      const result = await instance.onReady();

      expect(logger.warn).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.reason).toBe(NotReadyReason.NO_CLIENT);
    });

    it('provides the initial config object via the initialConfig property', () => {
      instance = createInstance(config);

      expect((instance as MockedReactSDKClient).initialConfig).toEqual(config);
    });

    it('provides a default user object', () => {
      instance = createInstance(config);

      expect(instance.user).toEqual({
        id: null,
        attributes: {},
      });
    });

    it('provides access to the underlying client', () => {
      instance = createInstance(config);

      expect(createInstanceSpy).toHaveBeenCalledTimes(1);
      expect(createInstanceSpy.mock.results[0].type).toBe('return');
      expect(createInstanceSpy.mock.results[0].value).toBe((instance as MockedReactSDKClient).client);
    });

    it('adds react-sdk clientEngine and clientVersion to the config, and passed the config to createInstance', () => {
      createInstance(config);

      expect(createInstanceSpy).toHaveBeenCalledTimes(1);
      expect(createInstanceSpy).toHaveBeenCalledWith({
        ...config,
        clientEngine: 'react-sdk',
        clientVersion: '3.2.3',
      });
    });

    it('provides access to the underlying client notificationCenter', () => {
      instance = createInstance(config);

      expect(instance.notificationCenter).toBe((instance as MockedReactSDKClient).client.notificationCenter);
    });

    it('provides access to the underlying client notificationCenter', () => {
      instance = createInstance(config);

      expect(instance.notificationCenter).toBe((instance as MockedReactSDKClient).client.notificationCenter);
    });
  });

  describe('onReady and isReady', () => {
    beforeEach(() => {
      instance = createInstance(config);
    });

    describe('if Optimizely client is null', () => {
      beforeEach(() => {
        // Mocks clientAndUserReadyPromise value instead of _client = null because test initialization of
        // instance causes clientAndUserReadyPromise to return { success: true }
        //@ts-ignore
        instance.clientAndUserReadyPromise = new Promise((resolve) => {
          resolve({
            success: false,
            reason: NotReadyReason.NO_CLIENT,
            message: 'Optimizely client failed to initialize.',
          });
        });
      });

      it('fulfills the returned promise with success: false when a user is set', async () => {
        await instance.setUser({
          id: userId,
        });

        const result = await instance.onReady();

        expect(result.success).toBe(false);
        expect(instance.isReady()).toBe(false);
        expect(instance.getIsReadyPromiseFulfilled()).toBe(true);
      });

      it('waits for the inner client onReady to fulfill with success = false before fulfilling the returned promise', async () => {
        const mockInnerClientOnReady = jest.spyOn(mockInnerClient, 'onReady');
        let resolveInnerClientOnReady: (result: OnReadyResult) => void = () => {};
        const mockReadyPromise: Promise<OnReadyResult> = new Promise((res) => {
          resolveInnerClientOnReady = res;
        });
        mockInnerClientOnReady.mockReturnValueOnce(mockReadyPromise);
        jest.spyOn(mockOptimizelyUserContext, 'getUserId').mockReturnValue(userId);

        resolveInnerClientOnReady({ success: true });
        await instance.setUser({
          id: userId,
        });
        const result = await instance.onReady();

        expect(result.success).toBe(false);
        expect(instance.isReady()).toBe(false);
        expect(instance.getIsReadyPromiseFulfilled()).toBe(true);
      });
    });

    it('fulfills the returned promise with success: false when the timeout expires, and no user is set', async () => {
      const result = await instance.onReady({ timeout: 1 });

      expect(result.success).toBe(false);
    });

    it('fulfills the returned promise with success: true when a user is set', async () => {
      jest.spyOn(mockInnerClient, 'onReady').mockResolvedValue({ success: true });
      instance = createInstance(config);
      jest.spyOn(instance, 'fetchQualifiedSegments').mockResolvedValue(true);

      await instance.setUser({
        id: userId,
      });
      const result = await instance.onReady();

      expect(result.success).toBe(true);
      expect(instance.isReady()).toBe(true);
      expect(instance.getIsReadyPromiseFulfilled()).toBe(true);
    });

    it('fulfills the returned promise with success: false when fetchqualifiedsegment is false', async () => {
      jest.spyOn(mockInnerClient, 'onReady').mockResolvedValue({ success: true });
      instance = createInstance(config);
      jest.spyOn(instance, 'fetchQualifiedSegments').mockResolvedValue(false);

      await instance.setUser({
        id: userId,
      });
      const result = await instance.onReady();

      expect(result.success).toBe(false);
      expect(instance.isReady()).toBe(false);
      expect(instance.getIsReadyPromiseFulfilled()).toBe(true);
    });

    it('waits for the inner client onReady to fulfill with success = true before fulfilling the returned promise', async () => {
      const mockInnerClientOnReady = jest.spyOn(mockInnerClient, 'onReady');
      let resolveInnerClientOnReady: (result: OnReadyResult) => void = () => {};
      const mockReadyPromise: Promise<OnReadyResult> = new Promise((res) => {
        resolveInnerClientOnReady = res;
      });
      mockInnerClientOnReady.mockReturnValueOnce(mockReadyPromise);
      instance = createInstance(config);
      jest.spyOn(instance, 'fetchQualifiedSegments').mockImplementation(async () => true);

      await instance.setUser({
        id: userId,
      });
      resolveInnerClientOnReady({ success: true });
      const result = await instance.onReady();

      expect(result.success).toBe(true);
      expect(instance.isReady()).toBe(true);
      expect(instance.getIsReadyPromiseFulfilled()).toBe(true);
    });
  });

  describe('setUser', () => {
    it('if client is null, user context is null', async () => {
      // @ts-ignore
      instance._client = null;
      await instance.setUser(DefaultUser);

      expect(logger.warn).toHaveBeenCalled();
      expect(instance.getUserContext()).toBe(null);
    });

    it('if user id is not present, and ODP is explicitly off, user promise will be pending', async () => {
      jest.spyOn(mockInnerClient, 'onReady').mockResolvedValue({ success: true });

      instance = createInstance({
        ...config,
        odpOptions: {
          disabled: true,
        },
      });

      await instance.setUser(DefaultUser);
      expect(instance.isReady()).toBe(false);

      await instance.setUser({ id: 'user123' });
      await instance.onReady();

      expect(instance.isReady()).toBe(true);
    });

    it('can be called with no/default user set', async () => {
      jest.spyOn(mockOptimizelyUserContext, 'getUserId').mockReturnValue(validVuid);

      instance = createInstance(config);
      await instance.setUser(DefaultUser);

      expect(instance.user.id).toEqual(validVuid);
    });

    it('updates the user object with id and attributes', async () => {
      jest.spyOn(mockOptimizelyUserContext, 'getUserId').mockReturnValue(userId);

      instance = createInstance(config);
      await instance.setUser({
        id: userId,
        attributes: userAttributes,
      });

      expect(instance.user).toEqual({
        id: userId,
        attributes: userAttributes,
      });
    });

    it('implicitly calls fetchqualifiedsegements', async () => {
      instance = createInstance(config);
      jest.spyOn(instance, 'fetchQualifiedSegments').mockResolvedValue(true);

      await instance.setUser({
        id: userId,
      });

      expect(instance.fetchQualifiedSegments).toHaveBeenCalledTimes(1);
    });

    it('calls fetchqualifiedsegements internally on each setuser call after onready', async () => {
      instance = createInstance(config);
      jest.spyOn(instance, 'fetchQualifiedSegments').mockImplementation(async () => true);

      await instance.setUser({
        id: userId,
      });
      await instance.onReady();
      await instance.setUser({
        id: userId,
      });
      await instance.setUser({
        id: userId,
      });

      expect(instance.fetchQualifiedSegments).toHaveBeenCalledTimes(3);
    });
  });

  describe('onUserUpdate', () => {
    it('adds and removes update handlers', async () => {
      jest.spyOn(mockOptimizelyUserContext, 'getUserId').mockReturnValue(userId);
      instance = createInstance(config);
      const onUserUpdateListener = jest.fn();

      const dispose = instance.onUserUpdate(onUserUpdateListener);
      await instance.setUser({
        id: userId,
      });

      expect(onUserUpdateListener).toHaveBeenCalledTimes(1);
      expect(onUserUpdateListener).toHaveBeenCalledWith({
        id: userId,
        attributes: {},
      });

      dispose();
      await instance.setUser({
        id: userId,
      });

      expect(onUserUpdateListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOptimizelyConfig', () => {
    beforeEach(async () => {
      await setupUserContext();
      const mockFn = mockInnerClient.getOptimizelyConfig as jest.Mock;
      mockFn.mockReturnValue({
        attributes: [],
        audiences: [],
        datafile: 'datafile',
        environmentKey: 'development',
        events: [],
        experimentsMap: {},
        featuresMap: {},
        revision: 1,
        sdkKey: 'sdkKey',
      });
    });

    it('if client is null, returns null', () => {
      // @ts-ignore
      instance._client = null;
      const result = instance.getOptimizelyConfig();

      expect(result).toBe(null);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('returns the config object from the inner SDK', () => {
      const result = instance.getOptimizelyConfig();

      expect(result).toEqual({
        attributes: [],
        audiences: [],
        datafile: 'datafile',
        environmentKey: 'development',
        events: [],
        experimentsMap: {},
        featuresMap: {},
        revision: 1,
        sdkKey: 'sdkKey',
      });
    });
  });

  describe('getIsUsingSdkKey', () => {
    it('returns true if the SDK key is being used', () => {
      instance = createInstance({
        ...config,
        sdkKey: 'sdkKey',
      });

      expect(instance.getIsUsingSdkKey()).toBe(true);
    });

    it('returns false if the SDK key is not being used', () => {
      instance = createInstance({
        datafile: 'datafile',
      });

      expect(instance.getIsUsingSdkKey()).toBe(false);
    });
  });

  describe('activate', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, activate returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.activate as jest.Mock;
      mockFn.mockReturnValue('var1');

      const result = instance.activate('exp1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('if user id is not present, activate returns null', () => {
      instance.user.id = null;
      const mockFn = mockInnerClient.activate as jest.Mock;
      mockFn.mockReturnValue('var1');

      const result = instance.activate('exp1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('activate returns the correct variation key', () => {
      const mockFn = mockInnerClient.activate as jest.Mock;
      mockFn.mockReturnValue('var1');

      let result = instance.activate('exp1');

      expect(result).toBe('var1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', userId, userAttributes);
      mockFn.mockReset();
      mockFn.mockReturnValue('var2');

      result = instance.activate('exp1', 'user2', { bar: 'baz' });

      expect(result).toBe('var2');
      expect(mockInnerClient.activate).toHaveBeenCalledTimes(1);
      expect(mockInnerClient.activate).toHaveBeenCalledWith('exp1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getVariation', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('If client is null, getVariation returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getVariation as jest.Mock;
      mockFn.mockReturnValue('var1');

      const result = instance.getVariation('exp1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toEqual(null);
    });

    it('if user id is not present, getVariation returns null', () => {
      instance.user.id = null;

      const result = instance.getVariation('exp1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getVariation returns correct value', () => {
      const mockFn = mockInnerClient.getVariation as jest.Mock;
      mockFn.mockReturnValue('var1');

      let result = instance.getVariation('exp1');

      expect(result).toEqual('var1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue('var2');

      result = instance.getVariation('exp1', 'user2', { bar: 'baz' });

      expect(result).toEqual('var2');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getFeatureVariables', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('returns an empty object when the inner SDK returns no variables', () => {
      (mockInnerClient.getFeatureVariable as jest.Mock).mockReturnValue(null);

      const result = instance.getFeatureVariables('feat1');

      expect(result).toEqual({});
    });

    it('if user id is not present, getFeatureVariables return empty object', () => {
      instance.user.id = null;

      const result = instance.getFeatureVariables('feat1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('if client is null, does not return an object with variables of all types returned from the inner sdk ', async () => {
      // @ts-ignore
      instance._client = null;
      (mockInnerClient.getOptimizelyConfig as jest.Mock).mockReturnValue({
        featuresMap: {
          feat1: {
            variablesMap: {
              bvar: {
                id: '0',
                key: 'bvar',
                type: 'boolean',
                value: 'false',
              },
              svar: {
                id: '1',
                key: 'svar',
                type: 'string',
                value: '',
              },
              ivar: {
                id: '2',
                key: 'ivar',
                type: 'integer',
                value: '0',
              },
              dvar: {
                id: '3',
                key: 'dvar',
                type: 'double',
                value: '0',
              },
              jvar: {
                id: '4',
                key: 'jvar',
                type: 'json',
                value: '{}',
              },
            },
          },
        },
      });
      (mockInnerClient.getFeatureVariable as jest.Mock).mockImplementation(
        (featureKey: string, variableKey: string) => {
          switch (variableKey) {
            case 'bvar':
              return true;
            case 'svar':
              return 'whatsup';
            case 'ivar':
              return 10;
            case 'dvar':
              return -10.5;
            case 'jvar':
              return { value: 'json value' };
            default:
              return null;
          }
        }
      );

      const result = instance.getFeatureVariables('feat1');

      expect(result).toEqual({});
    });

    it('returns an empty object when the inner client misses optimizely config', () => {
      const mockFn = mockInnerClient.getOptimizelyConfig as jest.Mock;
      mockFn.mockReturnValue(null);
      (mockInnerClient.getFeatureVariable as jest.Mock).mockImplementation(
        (featureKey: string, variableKey: string) => {
          switch (variableKey) {
            case 'bvar':
              return true;
            case 'svar':
              return 'whatsup';
            case 'ivar':
              return 10;
            case 'dvar':
              return -10.5;
            case 'jvar':
              return { value: 'json value' };
            default:
              return null;
          }
        }
      );

      const result = instance.getFeatureVariables('feat1');

      expect(result).toEqual({});
    });

    it('returns an empty object when feature key is not found in the optimizely config', () => {
      (mockInnerClient.getOptimizelyConfig as jest.Mock).mockReturnValue({
        featuresMap: {
          feat1: {
            variablesMap: {
              bvar: {
                id: '0',
                key: 'bvar',
                type: 'boolean',
                value: 'false',
              },
              svar: {
                id: '1',
                key: 'svar',
                type: 'string',
                value: '',
              },
              ivar: {
                id: '2',
                key: 'ivar',
                type: 'integer',
                value: '0',
              },
              dvar: {
                id: '3',
                key: 'dvar',
                type: 'double',
                value: '0',
              },
              jvar: {
                id: '4',
                key: 'jvar',
                type: 'json',
                value: '{}',
              },
            },
          },
        },
      });

      const result = instance.getFeatureVariables('feat2');

      expect(result).toEqual({});
    });

    it('returns an object with variables of all types returned from the inner sdk ', async () => {
      (mockInnerClient.getOptimizelyConfig as jest.Mock).mockReturnValue({
        featuresMap: {
          feat1: {
            variablesMap: {
              bvar: {
                id: '0',
                key: 'bvar',
                type: 'boolean',
                value: 'false',
              },
              svar: {
                id: '1',
                key: 'svar',
                type: 'string',
                value: '',
              },
              ivar: {
                id: '2',
                key: 'ivar',
                type: 'integer',
                value: '0',
              },
              dvar: {
                id: '3',
                key: 'dvar',
                type: 'double',
                value: '0',
              },
              jvar: {
                id: '4',
                key: 'jvar',
                type: 'json',
                value: '{}',
              },
            },
          },
        },
      });
      (mockInnerClient.getFeatureVariable as jest.Mock).mockImplementation(
        (featureKey: string, variableKey: string) => {
          switch (variableKey) {
            case 'bvar':
              return true;
            case 'svar':
              return 'whatsup';
            case 'ivar':
              return 10;
            case 'dvar':
              return -10.5;
            case 'jvar':
              return { value: 'json value' };
            default:
              return null;
          }
        }
      );

      const result = instance.getFeatureVariables('feat1');

      expect(result).toEqual({
        bvar: true,
        svar: 'whatsup',
        ivar: 10,
        dvar: -10.5,
        jvar: {
          value: 'json value',
        },
      });
    });
  });

  describe('getFeatureVariable', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getFeatureVariable returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getFeatureVariable as jest.Mock;
      mockFn.mockReturnValue({
        num_buttons: 0,
        text: 'default value',
      });

      const result = instance.getFeatureVariable('feat1', 'dvar1', 'user1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toEqual(null);
    });

    it('if user id is not present, getFeatureVariable returns null', () => {
      instance.user.id = null;

      // @ts-ignore
      const result = instance.getFeatureVariable('feat1', 'dvar1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getFeatureVariable returns correct value', () => {
      const mockFn = mockInnerClient.getFeatureVariable as jest.Mock;
      mockFn.mockReturnValue({
        num_buttons: 0,
        text: 'default value',
      });

      let result = instance.getFeatureVariable('feat1', 'dvar1', 'user1');

      expect(result).toEqual({
        num_buttons: 0,
        text: 'default value',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'dvar1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue({
        num_buttons: 0,
        text: 'variable value',
      });

      result = instance.getFeatureVariable('feat1', 'dvar1', 'user2', {
        bar: 'baz',
      });

      expect(result).toEqual({
        num_buttons: 0,
        text: 'variable value',
      });
      expect(mockInnerClient.getFeatureVariable).toHaveBeenCalledTimes(1);
      expect(mockInnerClient.getFeatureVariable).toHaveBeenCalledWith('feat1', 'dvar1', 'user2', { bar: 'baz' });
    });
  });

  describe('getFeatureVariableString', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getFeatureVariableString returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getFeatureVariableString as jest.Mock;
      mockFn.mockReturnValue('varval1');

      const result = instance.getFeatureVariableString('feat1', 'svar1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('if user id is not present, getFeatureVariableString returns null', () => {
      instance.user.id = null;

      const result = instance.getFeatureVariableString('feat1', 'svar1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getFeatureVariableString returns correct string variable', () => {
      const mockFn = mockInnerClient.getFeatureVariableString as jest.Mock;
      mockFn.mockReturnValue('varval1');

      let result = instance.getFeatureVariableString('feat1', 'svar1');

      expect(result).toBe('varval1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'svar1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue('varval2');

      result = instance.getFeatureVariableString('feat1', 'svar1', 'user2', {
        bar: 'baz',
      });

      expect(result).toBe('varval2');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'svar1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getFeatureVariableInteger', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getFeatureVariableInteger returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getFeatureVariableInteger as jest.Mock;
      mockFn.mockReturnValue(15);

      const result = instance.getFeatureVariableInteger('feat1', 'ivar1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('if user id is not present, getFeatureVariableInteger returns null', () => {
      instance.user.id = null;

      const result = instance.getFeatureVariableInteger('feat1', 'svar1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getFeatureVariableInteger returns correct integer variable', () => {
      const mockFn = mockInnerClient.getFeatureVariableInteger as jest.Mock;
      mockFn.mockReturnValue(15);

      let result = instance.getFeatureVariableInteger('feat1', 'ivar1');

      expect(result).toBe(15);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'ivar1', 'user1', {
        foo: 'bar',
      });
      mockFn.mockReset();
      mockFn.mockReturnValue(-20);

      result = instance.getFeatureVariableInteger('feat1', 'ivar1', 'user2', {
        bar: 'baz',
      });

      expect(result).toBe(-20);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'ivar1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getFeatureVariableBoolean', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getFeatureVariableBoolean returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getFeatureVariableBoolean as jest.Mock;
      mockFn.mockReturnValue(false);

      const result = instance.getFeatureVariableBoolean('feat1', 'bvar1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('if user id is not present, getFeatureVariableBoolean returns null', () => {
      instance.user.id = null;

      const result = instance.getFeatureVariableBoolean('feat1', 'svar1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getFeatureVariableBoolean returns correct boolean variable', () => {
      const mockFn = mockInnerClient.getFeatureVariableBoolean as jest.Mock;
      mockFn.mockReturnValue(false);

      let result = instance.getFeatureVariableBoolean('feat1', 'bvar1');

      expect(result).toBe(false);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'bvar1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue(true);

      result = instance.getFeatureVariableBoolean('feat1', 'bvar1', 'user2', {
        bar: 'baz',
      });

      expect(result).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'bvar1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getFeatureVariableDouble', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if  client is null, getFeatureVariableDouble returns null', () => {
      // @ts-ignore
      instance._client = null;

      const mockFn = mockInnerClient.getFeatureVariableDouble as jest.Mock;
      mockFn.mockReturnValue(15.5);

      const result = instance.getFeatureVariableDouble('feat1', 'dvar1');

      expect(result).toBe(null);
    });

    it('if user id is not present, getFeatureVariableDouble returns null', () => {
      instance.user.id = null;

      const result = instance.getFeatureVariableDouble('feat1', 'svar1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getFeatureVariableDouble returns correct double variable', () => {
      const mockFn = mockInnerClient.getFeatureVariableDouble as jest.Mock;
      mockFn.mockReturnValue(15.5);

      let result = instance.getFeatureVariableDouble('feat1', 'dvar1');

      expect(result).toBe(15.5);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'dvar1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue(-20.2);

      result = instance.getFeatureVariableDouble('feat1', 'dvar1', 'user2', {
        bar: 'baz',
      });

      expect(result).toBe(-20.2);
      expect(mockInnerClient.getFeatureVariableDouble).toHaveBeenCalledTimes(1);
      expect(mockInnerClient.getFeatureVariableDouble).toHaveBeenCalledWith('feat1', 'dvar1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getFeatureVariableJSON', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getFeatureVariableJSON returns null', () => {
      // @ts-ignore
      instance._client = null;

      const mockFn = mockInnerClient.getFeatureVariableJSON as jest.Mock;
      mockFn.mockReturnValue({
        num_buttons: 0,
        text: 'default value',
      });

      const result = instance.getFeatureVariableJSON('feat1', 'dvar1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toEqual(null);
    });

    it('if user id is not present, getFeatureVariableJSON returns null', () => {
      instance.user.id = null;

      const result = instance.getFeatureVariableJSON('feat1', 'svar1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getFeatureVariableJSON returns correct JSON', () => {
      const mockFn = mockInnerClient.getFeatureVariableJSON as jest.Mock;
      mockFn.mockReturnValue({
        num_buttons: 0,
        text: 'default value',
      });

      let result = instance.getFeatureVariableJSON('feat1', 'dvar1');

      expect(result).toEqual({
        num_buttons: 0,
        text: 'default value',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'dvar1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue({
        num_buttons: 0,
        text: 'variable value',
      });

      result = instance.getFeatureVariableJSON('feat1', 'dvar1', 'user2', {
        bar: 'baz',
      });

      expect(result).toEqual({
        num_buttons: 0,
        text: 'variable value',
      });
      expect(mockInnerClient.getFeatureVariableJSON).toHaveBeenCalledTimes(1);
      expect(mockInnerClient.getFeatureVariableJSON).toHaveBeenCalledWith('feat1', 'dvar1', 'user2', { bar: 'baz' });
    });
  });

  describe('getAllFeatureVariables', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('If client is null, does not return an object with variables of all types returned from the inner sdk ', async () => {
      // @ts-ignore
      instance._client = null;

      const anyClient = mockInnerClient.getAllFeatureVariables as jest.Mock;
      anyClient.mockReturnValue({
        bvar: true,
        svar: 'whatsup',
        ivar: 10,
        dvar: -10.5,
        jvar: {
          value: 'json value',
        },
      });

      const result = instance.getAllFeatureVariables('feat1', 'user1');

      expect(result).toEqual({});
    });

    it('returns an empty object when the inner SDK returns no variables', () => {
      const anyClient = mockInnerClient.getAllFeatureVariables as jest.Mock;
      anyClient.mockReturnValue({});

      instance = createInstance(config);
      const result = instance.getAllFeatureVariables('feat1', 'user1');

      expect(result).toEqual({});
    });

    it('if user id is not present, getFeatureVariable returns null', () => {
      instance.user.id = null;
      // @ts-ignore

      const result = instance.getAllFeatureVariables('feat1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('returns an object with variables of all types returned from the inner sdk ', async () => {
      const anyClient = mockInnerClient.getAllFeatureVariables as jest.Mock;
      anyClient.mockReturnValue({
        bvar: true,
        svar: 'whatsup',
        ivar: 10,
        dvar: -10.5,
        jvar: {
          value: 'json value',
        },
      });

      const result = instance.getAllFeatureVariables('feat1', 'user1');

      expect(result).toEqual({
        bvar: true,
        svar: 'whatsup',
        ivar: 10,
        dvar: -10.5,
        jvar: {
          value: 'json value',
        },
      });
    });

    it('getAllFeatureVariables with overrides returns correct value', async () => {
      const mockFn = mockInnerClient.getAllFeatureVariables as jest.Mock;
      mockFn.mockReturnValue({
        bvar: true,
        svar: 'whatsup',
        ivar: 10,
        dvar: -10.5,
        jvar: {
          value: 'json value',
        },
      });

      let result = instance.getAllFeatureVariables('feat1', 'user1');

      expect(result).toEqual({
        bvar: true,
        svar: 'whatsup',
        ivar: 10,
        dvar: -10.5,
        jvar: {
          value: 'json value',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue({
        bvar: false,
        svar: 'another var',
        ivar: 11,
        dvar: -11.5,
        jvar: {
          value: 'json another value',
        },
      });

      result = instance.getAllFeatureVariables('feat1', 'user2', {
        bar: 'baz',
      });

      expect(result).toEqual({
        bvar: false,
        svar: 'another var',
        ivar: 11,
        dvar: -11.5,
        jvar: {
          value: 'json another value',
        },
      });
      expect(mockInnerClient.getAllFeatureVariables).toHaveBeenCalledTimes(1);
      expect(mockInnerClient.getAllFeatureVariables).toHaveBeenCalledWith('feat1', 'user2', { bar: 'baz' });
    });
  });

  describe('isFeatureEnabled', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, isFeatureEnabled returns false', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.isFeatureEnabled as jest.Mock;
      mockFn.mockReturnValue(true);

      const result = instance.isFeatureEnabled('feat1');

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('if user id is not present, this enabling feature does not work', () => {
      instance.user.id = null;
      const mockFn = mockInnerClient.isFeatureEnabled as jest.Mock;

      instance.isFeatureEnabled('feat1');

      expect(logger.info).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('isFeatureEnabled returns correct value', () => {
      const mockFn = mockInnerClient.isFeatureEnabled as jest.Mock;
      mockFn.mockReturnValue(true);

      let result = instance.isFeatureEnabled('feat1');

      expect(result).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue(false);

      result = instance.isFeatureEnabled('feat1', 'user2', { bar: 'baz' });
      expect(result).toBe(false);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('feat1', 'user2', {
        bar: 'baz',
      });
    });
  });

  describe('getEnabledFeatures', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getEnabledFeatures returns empty array ', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock;
      mockFn.mockReturnValue(['feat1']);

      const result = instance.getEnabledFeatures();

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('if user id is not present, getFeatureVariable returns null', () => {
      instance.user.id = null;

      // @ts-ignore
      const result = instance.getEnabledFeatures();

      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('getEnabledFeatures returns correct value', () => {
      const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock;
      mockFn.mockReturnValue(['feat1']);

      let result = instance.getEnabledFeatures();

      expect(result).toEqual(['feat1']);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('user1', {
        foo: 'bar',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue(['feat1', 'feat2']);

      result = instance.getEnabledFeatures('user2', { bar: 'baz' });

      expect(result).toEqual(['feat1', 'feat2']);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('user2', {
        bar: 'baz',
      });
    });
  });

  describe('track', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, track method has not been called', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.track as jest.Mock;

      instance.track('evt1');

      expect(logger.warn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('if user id is not present, track has not been called', () => {
      instance.user.id = null;
      const mockFn = mockInnerClient.track as jest.Mock;

      instance.track('evt1');

      expect(logger.info).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    describe('track with different parameters', () => {
      it('track with only event key, calls inner client with valid arguments', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1');

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('evt1', 'user1', { foo: 'bar' }, undefined);
      });

      it('track with event key and overrided user id and attributes, calls inner client with valid arguments', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1', 'user2', { bar: 'baz' });

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('evt1', 'user2', { bar: 'baz' }, undefined);
      });

      it('track with event key and event tags, calls inner client with valid arguments', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1', { tagKey: 'tagVal' });

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('evt1', 'user1', { foo: 'bar' }, { tagKey: 'tagVal' });
      });

      it('track with event key, overrided user id and attributes and event tags, calls inner client with valid arguments', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1', 'user3', { bla: 'bla' }, { tagKey: 'tagVal' });

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('evt1', 'user3', { bla: 'bla' }, { tagKey: 'tagVal' });
      });

      it('track with event key, tags, and overrided attributes, calls inner client with valid arguments', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1', { tagKey: 'tagVal' }, { bla: 'bla' });

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('evt1', 'user1', { bla: 'bla' }, { tagKey: 'tagVal' });
      });

      it('track with event key, userId undefined, attributes undefined, and event tags, calls inner client with valid arguments', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1', undefined, undefined, { tagKey: 'tagVal' });

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('evt1', 'user1', { foo: 'bar' }, { tagKey: 'tagVal' });
      });
    });
  });

  describe('setForcedVariation', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, setForcedVariation returns false', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.setForcedVariation as jest.Mock;
      mockFn.mockReturnValue(true);

      const result = instance.setForcedVariation('exp1', 'var1');

      expect(result).toBe(false);
    });

    it('if variation key is undefined, setForcedVariation returns false', () => {
      const result = instance.setForcedVariation('exp1', 'user1', undefined);

      expect(result).toBe(false);
    });

    it('if user id is not present, setForcedVariation returns false', () => {
      instance.user.id = null;

      const result = instance.setForcedVariation('exp1', 'var1');

      expect(result).toBe(false);
    });

    it('setForcedVariation works as expected', () => {
      const mockFn = mockInnerClient.setForcedVariation as jest.Mock;
      mockFn.mockReturnValue(true);

      let result = instance.setForcedVariation('exp1', 'var1');

      expect(result).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', 'user1', 'var1');

      mockFn.mockReset();
      mockFn.mockReturnValue(false);

      result = instance.setForcedVariation('exp1', 'user2', 'var1');

      expect(result).toBe(false);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', 'user2', 'var1');
    });
  });

  describe('getForcedDecision', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if user context is not set, getForcedDecision returns null', () => {
      // @ts-ignore
      instance.userContext = null;

      const result = instance.getForcedDecision({
        flagKey: 'exp1',
      });

      expect(logger.warn).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getForcedDecision returns correct variation', () => {
      const mockFn = mockOptimizelyUserContext.getForcedDecision as jest.Mock;
      mockFn.mockReturnValue({
        variationKey: 'var1',
      });

      const result = instance.getForcedDecision({
        flagKey: 'exp1',
      });

      expect(result).toEqual({
        variationKey: 'var1',
      });
    });
  });

  describe('getForcedVariation', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, getForcedVariation returns null', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockInnerClient.getForcedVariation as jest.Mock;
      mockFn.mockReturnValue('var1');

      const result = instance.getForcedVariation('exp1');

      expect(result).toBe(null);
    });

    it('if user id is not present, getFeatureVariable returns null', () => {
      instance.user.id = null;
      // @ts-ignore
      const result = instance.getForcedVariation('exp1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('getForcedVariation returns correct variation', () => {
      const mockFn = mockInnerClient.getForcedVariation as jest.Mock;
      mockFn.mockReturnValue('var1');

      let result = instance.getForcedVariation('exp1');

      expect(result).toBe('var1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', 'user1');

      mockFn.mockReset();
      mockFn.mockReturnValue(null);

      result = instance.getForcedVariation('exp1', 'user2');

      expect(result).toBe(null);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', 'user2');
    });
  });

  describe('onForcedVariationsUpdate', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, does not call the handler function when setForcedVariation is called', () => {
      // @ts-ignore
      instance._client = null;
      const handler = jest.fn();

      instance.onForcedVariationsUpdate(handler);
      instance.setForcedVariation('my_exp', 'xxfueaojfe8&86', 'variation_a');

      expect(handler).toHaveBeenCalledTimes(0);
    });

    it('calls the handler function when setForcedVariation is called', () => {
      const handler = jest.fn();

      instance.onForcedVariationsUpdate(handler);
      instance.setForcedVariation('my_exp', 'xxfueaojfe8&86', 'variation_a');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('removes the handler when the cleanup fn is called', () => {
      const handler = jest.fn();

      const cleanup = instance.onForcedVariationsUpdate(handler);
      cleanup();
      instance.setForcedVariation('my_exp', 'xxfueaojfe8&86', 'variation_a');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('decide', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, decide does not evaluate flag', () => {
      // @ts-ignore
      instance._client = null;

      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result = instance.decide('exp1');

      expect(result).toEqual({
        enabled: false,
        flagKey: 'exp1',
        reasons: ['Unable to evaluate flag exp1 because Optimizely client failed to initialize.'],
        ruleKey: null,
        userContext: {
          attributes: userAttributes,
          id: userId,
        },
        variables: {},
        variationKey: null,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('if user id is not present, decide returns failed decision', () => {
      instance.user.id = null;
      const result = instance.decide('exp1');

      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual({
        enabled: false,
        flagKey: 'exp1',
        ruleKey: null,
        variationKey: null,
        variables: {},
        reasons: ['Unable to evaluate flag exp1 because User ID is not set.'],
        userContext: {
          id: null,
          attributes: userAttributes,
        },
      });
    });

    it('if user context has been failed to be made, decide returns failed decision', () => {
      // @ts-ignore
      instance.userContext = null;
      (mockInnerClient.createUserContext as jest.Mock).mockReturnValue(null);

      const result = instance.decide('exp1');

      expect(result).toEqual({
        enabled: false,
        flagKey: 'exp1',
        ruleKey: null,
        variationKey: null,
        variables: {},
        reasons: ['Not Evaluating flag exp1 because user id or attributes are not valid'],
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
      });
    });

    it('decide evaluates flag correctly', () => {
      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result = instance.decide('exp1');

      expect(result).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
        variables: {},
        variationKey: 'varition1',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', []);
    });

    it('for overrides, decide creates new context and evaluates flag correctly', () => {
      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      const mockCreateUserContext = mockInnerClient.createUserContext as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      let result = instance.decide('exp1');

      expect(result).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
        variables: {},
        variationKey: 'varition1',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', []);

      mockFn.mockReset();
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag2',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition2',
      });

      // override user and attributes
      result = instance.decide('exp1', [optimizely.OptimizelyDecideOption.INCLUDE_REASONS], 'user2', { bar: 'baz' });

      expect(result).toEqual({
        enabled: true,
        flagKey: 'theFlag2',
        reasons: [],
        ruleKey: '',
        userContext: {
          id: 'user2',
          attributes: { bar: 'baz' },
        },
        variables: {},
        variationKey: 'varition2',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('exp1', [optimizely.OptimizelyDecideOption.INCLUDE_REASONS]);
      expect(mockCreateUserContext).toHaveBeenCalledWith('user2', { bar: 'baz' });
    });
  });

  describe('decideAll', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, decideAll returns an empty object', () => {
      // @ts-ignore
      instance._client = null;
      const mockFn = mockOptimizelyUserContext.decideAll as jest.Mock;
      mockFn.mockReturnValue({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition1',
        },
      });

      // @ts-ignore
      const result = instance.decideAll();

      expect(result).toEqual({});
    });

    it('if user id is not present, decideAll returns empty object', () => {
      instance.user.id = null;

      const result = instance.decideAll();

      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('if user context has been failed to be made, decideAll returns empty object', () => {
      // @ts-ignore
      instance.userContext = null;
      (mockInnerClient.createUserContext as jest.Mock).mockReturnValue(null);

      const result = instance.decideAll();

      expect(result).toEqual({});
    });

    it('decideAll returns correct value', () => {
      const mockFn = mockOptimizelyUserContext.decideAll as jest.Mock;
      mockFn.mockReturnValue({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition1',
        },
      });

      const result = instance.decideAll();

      expect(result).toEqual({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: {
            id: 'user1',
            attributes: { foo: 'bar' },
          },
          variables: {},
          variationKey: 'varition1',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith([]);
    });

    it('for overrides, decideAll creates new context and evaluates flags correctly', () => {
      const mockFn = mockOptimizelyUserContext.decideAll as jest.Mock;
      const mockCreateUserContext = mockInnerClient.createUserContext as jest.Mock;
      mockFn.mockReturnValue({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition1',
        },
      });

      let result = instance.decideAll();

      expect(result).toEqual({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: {
            id: 'user1',
            attributes: { foo: 'bar' },
          },
          variables: {},
          variationKey: 'varition1',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith([]);
      expect(mockCreateUserContext).toHaveBeenCalledWith('user1', { foo: 'bar' });

      mockFn.mockReset();
      mockFn.mockReturnValue({
        theFlag2: {
          enabled: true,
          flagKey: 'theFlag2',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition2',
        },
      });

      result = instance.decideAll([optimizely.OptimizelyDecideOption.INCLUDE_REASONS], 'user2', { bar: 'baz' });

      expect(result).toEqual({
        theFlag2: {
          enabled: true,
          flagKey: 'theFlag2',
          reasons: [],
          ruleKey: '',
          userContext: {
            id: 'user2',
            attributes: { bar: 'baz' },
          },
          variables: {},
          variationKey: 'varition2',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith([optimizely.OptimizelyDecideOption.INCLUDE_REASONS]);
      expect(mockCreateUserContext).toHaveBeenCalledWith('user2', { bar: 'baz' });
    });
  });

  describe('decideForKeys', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, decideForKeys returns empty object', () => {
      // @ts-ignore
      instance._client = null;

      const mockFn = mockOptimizelyUserContext.decideForKeys as jest.Mock;
      mockFn.mockReturnValue({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition1',
        },
      });

      const result = instance.decideForKeys(['theFlag1']);

      expect(result).toEqual({});
    });

    it('if user id is not present, decideForKeys returns empty object', () => {
      instance.user.id = null;

      const result = instance.decideForKeys(['theFlag1']);

      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('if user context has been failed to be made, decideForKeys returns empty object', () => {
      // @ts-ignore
      instance.userContext = null;
      (mockInnerClient.createUserContext as jest.Mock).mockReturnValue(null);

      const result = instance.decideForKeys(['theFlag1']);

      expect(result).toEqual({});
    });

    it('decideForKeys returns correct value', () => {
      const mockFn = mockOptimizelyUserContext.decideForKeys as jest.Mock;

      mockFn.mockReturnValue({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition1',
        },
      });

      const result = instance.decideForKeys(['theFlag1']);

      expect(result).toEqual({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: {
            id: userId,
            attributes: userAttributes,
          },
          variables: {},
          variationKey: 'varition1',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(['theFlag1'], []);
    });

    it('for overrides, decideForKeys creates new context and evaluates flags correctly', () => {
      const mockFn = mockOptimizelyUserContext.decideForKeys as jest.Mock;
      const mockCreateUserContext = mockInnerClient.createUserContext as jest.Mock;
      mockFn.mockReturnValue({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition1',
        },
      });

      let result = instance.decideForKeys(['theFlag1']);

      expect(result).toEqual({
        theFlag1: {
          enabled: true,
          flagKey: 'theFlag1',
          reasons: [],
          ruleKey: '',
          userContext: {
            id: userId,
            attributes: userAttributes,
          },
          variables: {},
          variationKey: 'varition1',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(['theFlag1'], []);
      expect(mockCreateUserContext).toHaveBeenCalledWith('user1', { foo: 'bar' });

      mockFn.mockReset();
      mockFn.mockReturnValue({
        theFlag2: {
          enabled: true,
          flagKey: 'theFlag2',
          reasons: [],
          ruleKey: '',
          userContext: mockOptimizelyUserContext,
          variables: {},
          variationKey: 'varition2',
        },
      });

      result = instance.decideForKeys(['theFlag1'], [optimizely.OptimizelyDecideOption.INCLUDE_REASONS], 'user2', {
        bar: 'baz',
      });

      expect(result).toEqual({
        theFlag2: {
          enabled: true,
          flagKey: 'theFlag2',
          reasons: [],
          ruleKey: '',
          userContext: {
            id: 'user2',
            attributes: { bar: 'baz' },
          },
          variables: {},
          variationKey: 'varition2',
        },
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(['theFlag1'], [optimizely.OptimizelyDecideOption.INCLUDE_REASONS]);
      expect(mockCreateUserContext).toHaveBeenCalledWith('user2', { bar: 'baz' });
    });
  });

  describe('fetchQualifedSegments', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('should never call fetchQualifiedSegments if Optimizely user context is falsy', async () => {
      // @ts-ignore
      instance.userContext = false;

      const result = await instance.fetchQualifiedSegments();

      expect(result).toEqual(false);
    });

    it('should return false if fetch fails', async () => {
      jest.spyOn(instance, 'fetchQualifiedSegments').mockImplementation(async () => false);

      const result = await instance.fetchQualifiedSegments();

      expect(result).toEqual(false);
    });

    it('should return true if fetch successful', async () => {
      jest.spyOn(instance, 'fetchQualifiedSegments').mockImplementation(async () => true);

      const result = await instance.fetchQualifiedSegments();

      expect(result).toEqual(true);
    });

    it('if odp is explicitly off, it should return true', async () => {
      instance = createInstance({
        ...config,
        odpOptions: {
          disabled: true,
        },
      });
      await instance.setUser({
        id: userId,
        attributes: userAttributes,
      });

      const result = await instance.fetchQualifiedSegments();

      expect(result).toEqual(true);
    });

    it('if odp is not integrated, it should return true', async () => {
      (mockInnerClient.isOdpIntegrated as jest.Mock).mockReturnValue(false);

      const result = await instance.fetchQualifiedSegments();

      expect(result).toEqual(true);
    });
  });

  describe('removeAllForcedDecisions', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('should return false if no user context has been set ', () => {
      // @ts-ignore
      const mockFn = mockOptimizelyUserContext.removeAllForcedDecisions as jest.Mock;

      mockFn.mockReturnValue(false);

      const result = instance.removeAllForcedDecisions();

      expect(result).toBeDefined();
      expect(result).toEqual(false);
    });

    it('if user context is not present, removeAllForcedDecisions is not applied', () => {
      // @ts-ignore
      instance.userContext = null;

      const mockFn = mockOptimizelyUserContext.removeAllForcedDecisions as jest.Mock;

      instance.removeAllForcedDecisions();

      expect(logger.warn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('should return true if  user context has been set ', async () => {
      const mockFn = mockOptimizelyUserContext.removeAllForcedDecisions as jest.Mock;

      mockFn.mockReturnValue(true);

      const result = instance.removeAllForcedDecisions();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result).toEqual(true);
    });
  });

  describe('setForcedDecision', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, it should report an error', () => {
      // @ts-ignore
      instance._client = null;

      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result = instance.decide('theFlag1');

      expect(result).toEqual({
        enabled: false,
        flagKey: 'theFlag1',
        reasons: ['Unable to evaluate flag theFlag1 because Optimizely client failed to initialize.'],
        ruleKey: null,
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
        variables: {},
        variationKey: null,
      });
    });

    it('if user context is not present, setForcedDecision is not applied', () => {
      // @ts-ignore
      instance.userContext = null;
      const mockFn = mockOptimizelyUserContext.setForcedDecision as jest.Mock;

      instance.setForcedDecision(
        {
          flagKey: 'theFlag1',
          ruleKey: 'experiment',
        },
        { variationKey: 'varition2' }
      );

      expect(logger.warn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('should overwrite decide when forcedDecision is envoked', () => {
      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result = instance.decide('theFlag1');

      expect(result).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
        variables: {},
        variationKey: 'varition1',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('theFlag1', []);

      const mockFnForcedDecision = mockOptimizelyUserContext.setForcedDecision as jest.Mock;
      mockFnForcedDecision.mockReturnValue(true);

      instance.setForcedDecision(
        {
          flagKey: 'theFlag1',
          ruleKey: 'experiment',
        },
        { variationKey: 'varition2' }
      );

      expect(mockFnForcedDecision).toHaveBeenCalledTimes(1);

      mockFn.mockReset();
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition2',
      });

      const result2 = instance.decide('theFlag1', []);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('theFlag1', []);
      expect(result2).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: { id: userId, attributes: userAttributes },
        variables: {},
        variationKey: 'varition2',
      });
    });
  });

  describe('removeForcedDecision', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if client is null, should report flag evaluation error', () => {
      // @ts-ignore
      instance._client = null;

      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result = instance.decide('theFlag1');

      expect(result).toEqual({
        enabled: false,
        flagKey: 'theFlag1',
        reasons: ['Unable to evaluate flag theFlag1 because Optimizely client failed to initialize.'],
        ruleKey: null,
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
        variables: {},
        variationKey: null,
      });
    });

    it('if user context is not present, removeForcedDecision is not applied', () => {
      // @ts-ignore
      instance.userContext = null;
      const mockFn = mockOptimizelyUserContext.removeForcedDecision as jest.Mock;

      instance.removeForcedDecision({
        flagKey: 'theFlag1',
        ruleKey: 'experiment',
      });

      expect(logger.warn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('should revert back to the decide default value when removeForcedDecision is envoked after settingup the forced decision', () => {
      const mockFn = mockOptimizelyUserContext.decide as jest.Mock;
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result = instance.decide('theFlag1');

      expect(result).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: {
          id: userId,
          attributes: userAttributes,
        },
        variables: {},
        variationKey: 'varition1',
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('theFlag1', []);

      const mockFnForcedDecision = mockOptimizelyUserContext.setForcedDecision as jest.Mock;
      mockFnForcedDecision.mockReturnValue(true);

      instance.setForcedDecision(
        {
          flagKey: 'theFlag1',
          ruleKey: 'experiment',
        },
        { variationKey: 'varition2' }
      );

      expect(mockFnForcedDecision).toHaveBeenCalledTimes(1);

      mockFn.mockReset();
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition2',
      });

      const result2 = instance.decide('theFlag1', []);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('theFlag1', []);
      expect(result2).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: { id: userId, attributes: userAttributes },
        variables: {},
        variationKey: 'varition2',
      });

      const mockFnRemoveForcedDecision = mockOptimizelyUserContext.removeForcedDecision as jest.Mock;
      mockFnRemoveForcedDecision.mockReturnValue(true);
      instance.removeForcedDecision({
        flagKey: 'theFlag1',
        ruleKey: 'experiment',
      });

      mockFn.mockReset();
      mockFn.mockReturnValue({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: mockOptimizelyUserContext,
        variables: {},
        variationKey: 'varition1',
      });

      const result3 = instance.decide('theFlag1', []);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('theFlag1', []);
      expect(result3).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: { id: userId, attributes: userAttributes },
        variables: {},
        variationKey: 'varition1',
      });
    });
  });

  describe('sendOdpEvent', () => {
    beforeEach(() => {
      instance = createInstance(config);
    });

    it('should throw error when action param is falsy', async () => {
      const badValues = ['', '  '];
      badValues.forEach((item) => {
        instance.sendOdpEvent(item);
      });

      expect(logger.error).toHaveBeenCalledTimes(badValues.length);
      expect(logger.error).toHaveBeenCalledWith('ODP action is not valid (cannot be empty).');
    });

    it('should call sendOdpEvent once', async () => {
      instance.sendOdpEvent('test');

      expect(mockInnerClient.sendOdpEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVuid', () => {
    const vuidFormat = /^vuid_[a-f0-9]{27}$/;

    beforeEach(async () => {
      instance = createInstance(config);
    });

    it('should return undefined if client is null', () => {
      // @ts-ignore
      instance._client = null;

      const vuid = instance.getVuid();

      expect(vuid).toBeUndefined();
    });

    it('should return a valid vuid', async () => {
      const mockGetVuid = mockInnerClient.getVuid as jest.Mock;
      mockGetVuid.mockReturnValue(validVuid);

      const vuid = instance.getVuid();

      expect(vuid).toMatch(vuidFormat);
      expect(vuid).toEqual(validVuid);
    });
  });

  describe('getUserContext', () => {
    beforeEach(async () => {
      instance = createInstance(config);
    });

    it('should log a warning and return null if client is not defined', () => {
      // @ts-ignore
      instance._client = null;

      instance.getUserContext();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('Unable to get user context. Optimizely client not initialized.');
    });

    it('should log a warning and return null if setUser is not called first', () => {
      instance.getUserContext();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('Unable to get user context. User context not set.');
    });

    it('should return a userContext if setUser is called', () => {
      instance.setUser({
        id: userId,
        attributes: userAttributes,
      });

      const currentUserContext = instance.getUserContext();

      expect(logger.warn).toHaveBeenCalledTimes(0);
      expect(currentUserContext).not.toBeNull();
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if inner client is not present, close with a success promise', async () => {
      // @ts-ignore
      instance._client = null;

      const result = await instance.close();

      expect(result.success).toBe(true);
      expect(result.reason).toBe('Optimizely client is not initialized.');
    });

    it('if inner client is present, call the inner client close method', async () => {
      const mockFn = mockInnerClient.close as jest.Mock;

      await instance.close();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('notificationCenter', () => {
    beforeEach(async () => {
      await setupUserContext();
    });

    it('if inner client is not present, returns fallback notification center', () => {
      // @ts-ignore
      instance._client = null;
      const notificationCenter = instance.notificationCenter;

      expect(notificationCenter).toBeDefined();
      expect(notificationCenter.addNotificationListener).toBeDefined();

      const notificationId = notificationCenter.addNotificationListener('test', () => {});

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(notificationCenter.removeNotificationListener).toBeDefined();

      notificationCenter.removeNotificationListener(notificationId);

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(notificationCenter.clearNotificationListeners).toBeDefined();

      // @ts-ignore
      notificationCenter.clearNotificationListeners('');

      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(notificationCenter.clearAllNotificationListeners).toBeDefined();

      notificationCenter.clearAllNotificationListeners();

      expect(logger.warn).toHaveBeenCalledTimes(4);
    });

    it('if inner client is present, returns inner client notification center', () => {
      const notificationCenter = instance.notificationCenter;

      expect(notificationCenter).toBe(mockInnerClient.notificationCenter);
    });
  });
});
