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
jest.mock('@optimizely/optimizely-sdk');

import * as optimizely from '@optimizely/optimizely-sdk';

import { createInstance, OnReadyResult, ReactSDKClient } from './client';
interface MockedReactSDKClient extends ReactSDKClient {
  client: optimizely.Client;
  initialConfig: optimizely.Config;
}

describe('ReactSDKClient', () => {
  const config: optimizely.Config = {
    datafile: {},
  };

  let mockInnerClient: optimizely.Client;
  let mockOptimizelyUserContext: optimizely.OptimizelyUserContext;
  let createInstanceSpy: jest.Mock<optimizely.Client, [optimizely.Config]>;

  beforeEach(() => {
    mockOptimizelyUserContext = {
      decide: jest.fn(),
      decideAll: jest.fn(),
      decideForKeys: jest.fn(),
      setForcedDecision: jest.fn(),
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
      onReady: jest.fn(() => Promise.resolve({ success: false })),
      close: jest.fn(),
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

  it('provides the initial config object via the initialConfig property', () => {
    const instance = createInstance(config);
    expect((instance as MockedReactSDKClient).initialConfig).toEqual(config);
  });

  it('provides a default user object', () => {
    const instance = createInstance(config);
    expect(instance.user).toEqual({
      id: null,
      attributes: {},
    });
  });

  it('provides access to the underlying client', () => {
    const instance = createInstance(config);
    expect(createInstanceSpy).toBeCalledTimes(1);
    expect(createInstanceSpy.mock.results[0].type).toBe('return');
    expect(createInstanceSpy.mock.results[0].value).toBe((instance as MockedReactSDKClient).client);
  });

  it('adds react-sdk clientEngine and clientVersion to the config, and passed the config to createInstance', () => {
    createInstance(config);
    expect(createInstanceSpy).toBeCalledTimes(1);
    expect(createInstanceSpy).toBeCalledWith({
      ...config,
      clientEngine: 'react-sdk',
      clientVersion: '2.8.1',
    });
  });

  it('provides access to the underlying client notificationCenter', () => {
    const instance = createInstance(config);
    expect(instance.notificationCenter).toBe((instance as MockedReactSDKClient).client.notificationCenter);
  });

  describe('onReady', () => {
    let instance: ReactSDKClient;
    beforeEach(() => {
      instance = createInstance(config);
    });

    it('fulfills the returned promise with success: false when the timeout expires, and no user is set', async () => {
      const result = await instance.onReady({ timeout: 1 });
      expect(result.success).toBe(false);
    });

    it('fulfills the returned promise with success: true when a user is set', async () => {
      instance.setUser({
        id: 'user12345',
      });
      const result = await instance.onReady();
      expect(result.success).toBe(true);
    });

    describe('if Optimizely client is null', () => {
      beforeEach(() => {
        // Mocks dataReadyPromise value instead of _client = null because test initialization of instance causes dataReadyPromise to return { success: true }
        // @ts-ignore
        instance.dataReadyPromise = new Promise((resolve, reject) => {
          resolve({
            success: false,
            reason: 'NO_CLIENT',
            message: 'Optimizely client failed to initialize.',
          });
        });
      });

      it('fulfills the returned promise with success: false when a user is set', async () => {
        instance.setUser({
          id: 'user12345',
        });
        const result = await instance.onReady();
        expect(result.success).toBe(false);
      });

      it('waits for the inner client onReady to fulfill with success = false before fulfilling the returned promise', async () => {
        const mockInnerClientOnReady = jest.spyOn(mockInnerClient, 'onReady');
        let resolveInnerClientOnReady: (result: OnReadyResult) => void;
        const mockReadyPromise: Promise<OnReadyResult> = new Promise(res => {
          resolveInnerClientOnReady = res;
        });
        mockInnerClientOnReady.mockReturnValueOnce(mockReadyPromise);
        instance.setUser({
          id: 'user999',
        });
        resolveInnerClientOnReady!({ success: true });
        const result = await instance.onReady();
        expect(result.success).toBe(false);
      });
    });

    it('waits for the inner client onReady to fulfill with success = true before fulfilling the returned promise', async () => {
      const mockInnerClientOnReady = jest.spyOn(mockInnerClient, 'onReady');
      let resolveInnerClientOnReady: (result: OnReadyResult) => void;
      const mockReadyPromise: Promise<OnReadyResult> = new Promise(res => {
        resolveInnerClientOnReady = res;
      });
      mockInnerClientOnReady.mockReturnValueOnce(mockReadyPromise);
      instance.setUser({
        id: 'user999',
      });
      resolveInnerClientOnReady!({ success: true });
      const result = await instance.onReady();
      expect(result.success).toBe(true);
    });
  });

  describe('setUser', () => {
    it('updates the user object with id and attributes', () => {
      const instance = createInstance(config);
      instance.setUser({
        id: 'xxfueaojfe8&86',
        attributes: {
          foo: 'bar',
        },
      });
      expect(instance.user).toEqual({
        id: 'xxfueaojfe8&86',
        attributes: {
          foo: 'bar',
        },
      });
    });

    it('adds and removes update handlers', () => {
      const instance = createInstance(config);
      const onUserUpdateListener = jest.fn();
      const dispose = instance.onUserUpdate(onUserUpdateListener);
      instance.setUser({
        id: 'newUser',
      });
      expect(onUserUpdateListener).toBeCalledTimes(1);
      expect(onUserUpdateListener).toBeCalledWith({
        id: 'newUser',
        attributes: {},
      });
      dispose();
      instance.setUser({
        id: 'newUser2',
      });
      expect(onUserUpdateListener).toBeCalledTimes(1);
    });

    describe('pre-set user and user overrides', () => {
      let instance: ReactSDKClient;
      beforeEach(() => {
        instance = createInstance(config);
        instance.setUser({
          id: 'user1',
          attributes: {
            foo: 'bar',
          },
        });
        const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock;
        mockFn.mockReturnValue(['feat1', 'feat2']);
      });

      describe('if Optimizely client is null', () => {
        beforeEach(() => {
          // @ts-ignore
          instance._client = null;
        });

        it('cannot use pre-set or override user for activate', () => {
          const mockFn = mockInnerClient.activate as jest.Mock;
          mockFn.mockReturnValue('var1');
          const result = instance.activate('exp1');
          expect(result).toBe(null);
        });

        it('cannot use pre-set or override user for track', () => {
          const mockFn = mockInnerClient.track as jest.Mock;
          instance.track('evt1');
          expect(mockFn).toBeCalledTimes(0);
        });

        it('cannot use pre-set or override user for isFeatureEnabled', () => {
          const mockFn = mockInnerClient.isFeatureEnabled as jest.Mock;
          mockFn.mockReturnValue(true);
          const result = instance.isFeatureEnabled('feat1');
          expect(result).toBe(false);
        });

        it('cannot use pre-set and override user for getEnabledFeatures', () => {
          const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock;
          mockFn.mockReturnValue(['feat1']);
          const result = instance.getEnabledFeatures();
          expect(result).toEqual([]);
        });

        it('cannot use pre-set or override user for getVariation', () => {
          const mockFn = mockInnerClient.getVariation as jest.Mock;
          mockFn.mockReturnValue('var1');
          const result = instance.getVariation('exp1');
          expect(result).toEqual(null);
        });

        it('cannot use pre-set or override user for getFeatureVariableBoolean', () => {
          const mockFn = mockInnerClient.getFeatureVariableBoolean as jest.Mock;
          mockFn.mockReturnValue(false);
          const result = instance.getFeatureVariableBoolean('feat1', 'bvar1');
          expect(result).toBe(null);
        });

        it('cannot use pre-set or override user for getFeatureVariableString', () => {
          const mockFn = mockInnerClient.getFeatureVariableString as jest.Mock;
          mockFn.mockReturnValue('varval1');
          const result = instance.getFeatureVariableString('feat1', 'svar1');
          expect(result).toBe(null);
        });

        it('cannot use pre-set or override user for getFeatureVariableInteger', () => {
          const mockFn = mockInnerClient.getFeatureVariableInteger as jest.Mock;
          mockFn.mockReturnValue(15);
          const result = instance.getFeatureVariableInteger('feat1', 'ivar1');
          expect(result).toBe(null);
        });

        it('cannot use pre-set or override user for getFeatureVariableDouble', () => {
          const mockFn = mockInnerClient.getFeatureVariableDouble as jest.Mock;
          mockFn.mockReturnValue(15.5);
          const result = instance.getFeatureVariableDouble('feat1', 'dvar1');
          expect(result).toBe(null);
        });

        it('cannot use pre-set or override user for getFeatureVariableJSON', () => {
          const mockFn = mockInnerClient.getFeatureVariableJSON as jest.Mock;
          mockFn.mockReturnValue({
            num_buttons: 0,
            text: 'default value',
          });
          const result = instance.getFeatureVariableJSON('feat1', 'dvar1');
          expect(result).toEqual(null);
        });

        it('cannot use pre-set or override user for getFeatureVariable', () => {
          const mockFn = mockInnerClient.getFeatureVariable as jest.Mock;
          mockFn.mockReturnValue({
            num_buttons: 0,
            text: 'default value',
          });
          const result = instance.getFeatureVariable('feat1', 'dvar1', 'user1');
          expect(result).toEqual(null);
        });

        it('cannot use pre-set or override user for setForcedVariation', () => {
          const mockFn = mockInnerClient.setForcedVariation as jest.Mock;
          mockFn.mockReturnValue(true);
          const result = instance.setForcedVariation('exp1', 'var1');
          expect(result).toBe(false);
        });

        it('cannot use pre-set or override user for getForcedVariation', () => {
          const mockFn = mockInnerClient.getForcedVariation as jest.Mock;
          mockFn.mockReturnValue('var1');
          const result = instance.getForcedVariation('exp1');
          expect(result).toBe(null);
        });

        it('cannot use pre-set or override user for decide', () => {
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
              attributes: {
                foo: 'bar',
              },
              id: 'user1',
            },
            variables: {},
            variationKey: null,
          });
        });
      });

      it('can use pre-set and override user for activate', () => {
        const mockFn = mockInnerClient.activate as jest.Mock;
        mockFn.mockReturnValue('var1');
        let result = instance.activate('exp1');
        expect(result).toBe('var1');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user1', { foo: 'bar' });
        mockFn.mockReset();
        mockFn.mockReturnValue('var2');
        result = instance.activate('exp1', 'user2', { bar: 'baz' });
        expect(result).toBe('var2');
        expect(mockInnerClient.activate).toBeCalledTimes(1);
        expect(mockInnerClient.activate).toBeCalledWith('exp1', 'user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for track', () => {
        const mockFn = mockInnerClient.track as jest.Mock;
        instance.track('evt1');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('evt1', 'user1', { foo: 'bar' }, undefined);
        mockFn.mockReset();

        instance.track('evt1', 'user2', { bar: 'baz' });
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('evt1', 'user2', { bar: 'baz' }, undefined);
        mockFn.mockReset();

        // Use pre-set user with event tags
        instance.track('evt1', { tagKey: 'tagVal' });
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('evt1', 'user1', { foo: 'bar' }, { tagKey: 'tagVal' });
        mockFn.mockReset();

        // Use overrides with event tags
        instance.track('evt1', 'user3', { bla: 'bla' }, { tagKey: 'tagVal' });
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('evt1', 'user3', { bla: 'bla' }, { tagKey: 'tagVal' });
      });

      it('can use pre-set and override user for isFeatureEnabled', () => {
        const mockFn = mockInnerClient.isFeatureEnabled as jest.Mock;
        mockFn.mockReturnValue(true);
        let result = instance.isFeatureEnabled('feat1');
        expect(result).toBe(true);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue(false);
        result = instance.isFeatureEnabled('feat1', 'user2', { bar: 'baz' });
        expect(result).toBe(false);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for getEnabledFeatures', () => {
        const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock;
        mockFn.mockReturnValue(['feat1']);
        let result = instance.getEnabledFeatures();
        expect(result).toEqual(['feat1']);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue(['feat1', 'feat2']);
        result = instance.getEnabledFeatures('user2', { bar: 'baz' });
        expect(result).toEqual(['feat1', 'feat2']);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for getVariation', () => {
        const mockFn = mockInnerClient.getVariation as jest.Mock;
        mockFn.mockReturnValue('var1');
        let result = instance.getVariation('exp1');
        expect(result).toEqual('var1');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue('var2');
        result = instance.getVariation('exp1', 'user2', { bar: 'baz' });
        expect(result).toEqual('var2');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for getFeatureVariableBoolean', () => {
        const mockFn = mockInnerClient.getFeatureVariableBoolean as jest.Mock;
        mockFn.mockReturnValue(false);
        let result = instance.getFeatureVariableBoolean('feat1', 'bvar1');
        expect(result).toBe(false);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'bvar1', 'user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue(true);
        result = instance.getFeatureVariableBoolean('feat1', 'bvar1', 'user2', {
          bar: 'baz',
        });
        expect(result).toBe(true);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'bvar1', 'user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for getFeatureVariableString', () => {
        const mockFn = mockInnerClient.getFeatureVariableString as jest.Mock;
        mockFn.mockReturnValue('varval1');
        let result = instance.getFeatureVariableString('feat1', 'svar1');
        expect(result).toBe('varval1');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'svar1', 'user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue('varval2');
        result = instance.getFeatureVariableString('feat1', 'svar1', 'user2', {
          bar: 'baz',
        });
        expect(result).toBe('varval2');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'svar1', 'user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for getFeatureVariableInteger', () => {
        const mockFn = mockInnerClient.getFeatureVariableInteger as jest.Mock;
        mockFn.mockReturnValue(15);
        let result = instance.getFeatureVariableInteger('feat1', 'ivar1');
        expect(result).toBe(15);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'ivar1', 'user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue(-20);
        result = instance.getFeatureVariableInteger('feat1', 'ivar1', 'user2', {
          bar: 'baz',
        });
        expect(result).toBe(-20);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'ivar1', 'user2', {
          bar: 'baz',
        });
      });

      it('can use pre-set and override user for getFeatureVariableDouble', () => {
        const mockFn = mockInnerClient.getFeatureVariableDouble as jest.Mock;
        mockFn.mockReturnValue(15.5);
        let result = instance.getFeatureVariableDouble('feat1', 'dvar1');
        expect(result).toBe(15.5);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'dvar1', 'user1', {
          foo: 'bar',
        });
        mockFn.mockReset();
        mockFn.mockReturnValue(-20.2);
        result = instance.getFeatureVariableDouble('feat1', 'dvar1', 'user2', {
          bar: 'baz',
        });
        expect(result).toBe(-20.2);
        expect(mockInnerClient.getFeatureVariableDouble).toBeCalledTimes(1);
        expect(mockInnerClient.getFeatureVariableDouble).toBeCalledWith('feat1', 'dvar1', 'user2', { bar: 'baz' });
      });

      it('can use pre-set and override user for getFeatureVariableJSON', () => {
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'dvar1', 'user1', {
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
        expect(mockInnerClient.getFeatureVariableJSON).toBeCalledTimes(1);
        expect(mockInnerClient.getFeatureVariableJSON).toBeCalledWith('feat1', 'dvar1', 'user2', { bar: 'baz' });
      });

      it('can use pre-set and override user for getFeatureVariable', () => {
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'dvar1', 'user1', {
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
        expect(mockInnerClient.getFeatureVariable).toBeCalledTimes(1);
        expect(mockInnerClient.getFeatureVariable).toBeCalledWith('feat1', 'dvar1', 'user2', { bar: 'baz' });
      });

      it('can use pre-set and override user for setForcedVariation', () => {
        const mockFn = mockInnerClient.setForcedVariation as jest.Mock;
        mockFn.mockReturnValue(true);
        let result = instance.setForcedVariation('exp1', 'var1');
        expect(result).toBe(true);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user1', 'var1');

        mockFn.mockReset();
        mockFn.mockReturnValue(false);
        result = instance.setForcedVariation('exp1', 'user2', 'var1');
        expect(result).toBe(false);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user2', 'var1');
      });

      it('can use pre-set and override user for getForcedVariation', () => {
        const mockFn = mockInnerClient.getForcedVariation as jest.Mock;
        mockFn.mockReturnValue('var1');
        let result = instance.getForcedVariation('exp1');
        expect(result).toBe('var1');
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user1');

        mockFn.mockReset();
        mockFn.mockReturnValue(null);
        result = instance.getForcedVariation('exp1', 'user2');
        expect(result).toBe(null);
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', 'user2');
      });

      it('can use pre-set and override user for decide', () => {
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
            id: 'user1',
            attributes: { foo: 'bar' },
          },
          variables: {},
          variationKey: 'varition1',
        });
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', []);
        expect(mockCreateUserContext).toBeCalledWith('user1', { foo: 'bar' });
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('exp1', [optimizely.OptimizelyDecideOption.INCLUDE_REASONS]);
        expect(mockCreateUserContext).toBeCalledWith('user2', { bar: 'baz' });
      });

      describe('if Optimizely client is null', () => {
        it('cannot use pre-set or override user for decideAll', () => {
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
          // @ts-ignore
          instance._client = null;
          const result = instance.decideAll();
          expect(result).toEqual({});
        });
      });

      it('can use pre-set and override user for decideAll', () => {
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith([]);
        expect(mockCreateUserContext).toBeCalledWith('user1', { foo: 'bar' });
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith([optimizely.OptimizelyDecideOption.INCLUDE_REASONS]);
        expect(mockCreateUserContext).toBeCalledWith('user2', { bar: 'baz' });
      });

      describe('if Optimizely client is null', () => {
        it('cannot use pre-set or override user for decideForKeys', () => {
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
          // @ts-ignore
          instance._client = null;
          const result = instance.decideForKeys(['theFlag1']);
          expect(result).toEqual({});
        });
      });

      it('can use pre-set and override user for decideForKeys', () => {
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
              id: 'user1',
              attributes: { foo: 'bar' },
            },
            variables: {},
            variationKey: 'varition1',
          },
        });
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith(['theFlag1'], []);
        expect(mockCreateUserContext).toBeCalledWith('user1', { foo: 'bar' });
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith(['theFlag1'], [optimizely.OptimizelyDecideOption.INCLUDE_REASONS]);
        expect(mockCreateUserContext).toBeCalledWith('user2', { bar: 'baz' });
      });
    });

    describe('getFeatureVariables', () => {
      it('returns an empty object when the inner SDK returns no variables', () => {
        (mockInnerClient.getFeatureVariable as jest.Mock).mockReturnValue(null);
        const instance = createInstance(config);
        const result = instance.getFeatureVariables('feat1');
        expect(result).toEqual({});
      });

      describe('if Optimizely client is null', () => {
        it('does not return an object with variables of all types returned from the inner sdk ', () => {
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
          const instance = createInstance(config);
          instance.setUser({
            id: 'user1123',
          });
          // @ts-ignore
          instance._client = null;
          const result = instance.getFeatureVariables('feat1');
          expect(result).toEqual({});
        });
      });

      it('returns an object with variables of all types returned from the inner sdk ', () => {
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
        const instance = createInstance(config);
        instance.setUser({
          id: 'user1123',
        });
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

    describe('getAllFeatureVariables', () => {
      describe('if Optimizely client is null', () => {
        it('does not return an object with variables of all types returned from the inner sdk ', () => {
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
          const instance = createInstance(config);
          // @ts-ignore
          instance._client = null;
          instance.setUser({
            id: 'user1123',
          });
          const result = instance.getAllFeatureVariables('feat1', 'user1');
          expect(result).toEqual({});
        });

        it('cannot use pre-set and override user for getAllFeatureVariables', () => {
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
          const instance = createInstance(config);
          // @ts-ignore
          instance._client = null;
          instance.setUser({
            id: 'user1',
            attributes: {
              foo: 'bar',
            },
          });
          const result = instance.getAllFeatureVariables('feat1', 'user1');
          expect(result).toEqual({});
        });
      });

      it('returns an empty object when the inner SDK returns no variables', () => {
        const anyClient = mockInnerClient.getAllFeatureVariables as jest.Mock;
        anyClient.mockReturnValue({});
        const instance = createInstance(config);
        const result = instance.getAllFeatureVariables('feat1', 'user1');
        expect(result).toEqual({});
      });

      it('returns an object with variables of all types returned from the inner sdk ', () => {
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
        const instance = createInstance(config);
        instance.setUser({
          id: 'user1123',
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

      it('can use pre-set and override user for getAllFeatureVariables', () => {
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
        const instance = createInstance(config);
        instance.setUser({
          id: 'user1',
          attributes: {
            foo: 'bar',
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
        expect(mockFn).toBeCalledTimes(1);
        expect(mockFn).toBeCalledWith('feat1', 'user1', {
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
        expect(mockInnerClient.getAllFeatureVariables).toBeCalledTimes(1);
        expect(mockInnerClient.getAllFeatureVariables).toBeCalledWith('feat1', 'user2', { bar: 'baz' });
      });
    });
  });

  describe('onForcedVariationsUpdate', () => {
    let instance: ReactSDKClient;
    beforeEach(() => {
      instance = createInstance(config);
      instance.setUser({
        id: 'xxfueaojfe8&86',
        attributes: {
          foo: 'bar',
        },
      });
    });

    describe('if Optimizely client is null', () => {
      it('does not call the handler function when setForcedVariation is called', () => {
        // @ts-ignore
        instance._client = null;
        const handler = jest.fn();
        instance.onForcedVariationsUpdate(handler);
        instance.setForcedVariation('my_exp', 'xxfueaojfe8&86', 'variation_a');
        expect(handler).toBeCalledTimes(0);
      });
    });

    it('calls the handler function when setForcedVariation is called', () => {
      const handler = jest.fn();
      instance.onForcedVariationsUpdate(handler);
      instance.setForcedVariation('my_exp', 'xxfueaojfe8&86', 'variation_a');
      expect(handler).toBeCalledTimes(1);
    });

    it('removes the handler when the cleanup fn is called', () => {
      const handler = jest.fn();
      const cleanup = instance.onForcedVariationsUpdate(handler);
      cleanup();
      instance.setForcedVariation('my_exp', 'xxfueaojfe8&86', 'variation_a');
      expect(handler).not.toBeCalled();
    });
  });

  describe('removeAllForcedDecisions', () => {
    let instance: ReactSDKClient;
    beforeEach(() => {
      instance = createInstance(config);
    });

    it('should return false if no user context has been set ', () => {
      const mockFn = mockOptimizelyUserContext.removeAllForcedDecisions as jest.Mock;

      mockFn.mockReturnValue(false);

      const result = instance.removeAllForcedDecisions();
      expect(result).toBeDefined();
      expect(result).toEqual(false);
    });

    describe('if Optimizely client is null', () => {
      it('should return false', () => {
        // @ts-ignore
        instance._client = null;
        instance.setUser({
          id: 'user1',
        });
        const mockFn = mockOptimizelyUserContext.removeAllForcedDecisions as jest.Mock;

        mockFn.mockReturnValue(true);

        const result = instance.removeAllForcedDecisions();
        expect(mockFn).toBeCalledTimes(0);
        expect(result).toBeDefined();
        expect(result).toEqual(false);
      });
    });

    it('should return true if  user context has been set ', () => {
      instance.setUser({
        id: 'user1',
      });
      const mockFn = mockOptimizelyUserContext.removeAllForcedDecisions as jest.Mock;

      mockFn.mockReturnValue(true);

      const result = instance.removeAllForcedDecisions();
      expect(mockFn).toBeCalledTimes(1);
      expect(result).toBeDefined();
      expect(result).toEqual(true);
    });
  });

  describe('setForcedDecision', () => {
    let instance: ReactSDKClient;
    beforeEach(() => {
      instance = createInstance(config);
      instance.setUser({
        id: 'user1',
        attributes: {
          foo: 'bar',
        },
      });
    });

    describe('when Optimizely client is null', () => {
      it('should report an error', () => {
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

        // @ts-ignore
        instance._client = null;

        const result = instance.decide('theFlag1');
        expect(result).toEqual({
          enabled: false,
          flagKey: 'theFlag1',
          reasons: ['Unable to evaluate flag theFlag1 because Optimizely client failed to initialize.'],
          ruleKey: null,
          userContext: {
            id: 'user1',
            attributes: { foo: 'bar' },
          },
          variables: {},
          variationKey: null,
        });
      });
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
          id: 'user1',
          attributes: { foo: 'bar' },
        },
        variables: {},
        variationKey: 'varition1',
      });
      expect(mockFn).toBeCalledTimes(1);
      expect(mockFn).toBeCalledWith('theFlag1', []);

      const mockFnForcedDecision = mockOptimizelyUserContext.setForcedDecision as jest.Mock;
      mockFnForcedDecision.mockReturnValue(true);
      instance.setForcedDecision(
        {
          flagKey: 'theFlag1',
          ruleKey: 'experiment',
        },
        { variationKey: 'varition2' }
      );

      expect(mockFnForcedDecision).toBeCalledTimes(1);

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

      expect(mockFn).toBeCalledTimes(1);
      expect(mockFn).toBeCalledWith('theFlag1', []);
      expect(result2).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: { id: 'user1', attributes: { foo: 'bar' } },
        variables: {},
        variationKey: 'varition2',
      });
    });
  });

  describe('removeForcedDecision', () => {
    let instance: ReactSDKClient;
    beforeEach(() => {
      instance = createInstance(config);
      instance.setUser({
        id: 'user1',
        attributes: {
          foo: 'bar',
        },
      });
    });

    describe('when Optimizely client is null', () => {
      it('should report flag evaluation error', () => {
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

        // @ts-ignore
        instance._client = null;

        const result = instance.decide('theFlag1');
        expect(result).toEqual({
          enabled: false,
          flagKey: 'theFlag1',
          reasons: ['Unable to evaluate flag theFlag1 because Optimizely client failed to initialize.'],
          ruleKey: null,
          userContext: {
            id: 'user1',
            attributes: { foo: 'bar' },
          },
          variables: {},
          variationKey: null,
        });
      });
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
          id: 'user1',
          attributes: { foo: 'bar' },
        },
        variables: {},
        variationKey: 'varition1',
      });
      expect(mockFn).toBeCalledTimes(1);
      expect(mockFn).toBeCalledWith('theFlag1', []);

      const mockFnForcedDecision = mockOptimizelyUserContext.setForcedDecision as jest.Mock;
      mockFnForcedDecision.mockReturnValue(true);
      instance.setForcedDecision(
        {
          flagKey: 'theFlag1',
          ruleKey: 'experiment',
        },
        { variationKey: 'varition2' }
      );

      expect(mockFnForcedDecision).toBeCalledTimes(1);

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

      expect(mockFn).toBeCalledTimes(1);
      expect(mockFn).toBeCalledWith('theFlag1', []);
      expect(result2).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: { id: 'user1', attributes: { foo: 'bar' } },
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

      expect(mockFn).toBeCalledTimes(1);
      expect(mockFn).toBeCalledWith('theFlag1', []);
      expect(result3).toEqual({
        enabled: true,
        flagKey: 'theFlag1',
        reasons: [],
        ruleKey: '',
        userContext: { id: 'user1', attributes: { foo: 'bar' } },
        variables: {},
        variationKey: 'varition1',
      });
    });
  });
});
