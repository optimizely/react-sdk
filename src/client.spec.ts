/**
 * Copyright 2019, Optimizely
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
jest.mock('@optimizely/optimizely-sdk')

import * as optimizely from '@optimizely/optimizely-sdk'

import { createInstance, OnReadyResult, ReactSDKClient } from './client'

describe('ReactSDKClient', () => {
  const config: optimizely.Config = {
    datafile: {},
  }

  let mockInnerClient: optimizely.Client
  let createInstanceSpy: jest.Mock<optimizely.Client, [optimizely.Config]>

  beforeEach(() => {
    mockInnerClient = {
      activate: jest.fn(() => null),
      track: jest.fn(),
      isFeatureEnabled: jest.fn(() => false),
      getEnabledFeatures: jest.fn(() => []),
      getVariation: jest.fn(() => null),
      setForcedVariation: jest.fn(() => false),
      getForcedVariation: jest.fn(() => null),
      getFeatureVariableBoolean: jest.fn(() => null),
      getFeatureVariableDouble: jest.fn(() => null),
      getFeatureVariableInteger: jest.fn(() => null),
      getFeatureVariableString: jest.fn(() => null),
      onReady: jest.fn(() => Promise.resolve({ success: false })),
      close: jest.fn(),
      notificationCenter: {
        addNotificationListener: jest.fn(() => 0),
        removeNotificationListener: jest.fn(() => false),
        clearNotificationListeners: jest.fn(),
        clearAllNotificationListeners: jest.fn(),
      },
    }
    const anyOptly = optimizely as any
    anyOptly.createInstance.mockReturnValue(mockInnerClient)
    createInstanceSpy = (optimizely.createInstance) as jest.Mock<optimizely.Client, [optimizely.Config]>
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('provides the initial config object via the initialConfig property', () => {
    const instance = createInstance(config)
    expect(instance.initialConfig).toEqual(config)
  })

  it('provides a default user object', () => {
    const instance = createInstance(config)
    expect(instance.user).toEqual({
      id: null,
      attributes: {},
    })
  })

  it('provides access to the underlying client', () => {
    const instance = createInstance(config)
    expect(createInstanceSpy).toBeCalledTimes(1)
    expect(createInstanceSpy.mock.results[0].isThrow).toBe(false)
    expect(createInstanceSpy.mock.results[0].value).toBe(instance.client)
  })

  it('adds clientEngine react-sdk the config, and passed the config to createInstance', () => {
    createInstance(config)
    expect(createInstanceSpy).toBeCalledTimes(1)
    expect(createInstanceSpy).toBeCalledWith({
      ...config,
      clientEngine: 'react-sdk',
    })
  })

  it('provides access to the underlying client notificationCenter', () => {
    const instance = createInstance(config)
    expect(instance.notificationCenter).toBe(instance.client.notificationCenter)
  })

  describe('onReady', () => {
    it('fulfills the returned promise with success: false when the timeout expires, and no user is set', async () => {
      const instance = createInstance(config)
      const result = await instance.onReady({ timeout: 1 })
      expect(result.success).toBe(false)
    })

    it('fulfills the returned promise with success: true when a user is set', async () => {
      const instance = createInstance(config)
      instance.setUser({
        id: 'user12345',
      })
      const result = await instance.onReady()
      expect(result.success).toBe(true)
    })

    it('waits for the inner client onReady to fulfill before fulfilling the returned promise', async () => {
      const mockInnerClientOnReady = jest.spyOn(mockInnerClient, 'onReady')
      let resolveInnerClientOnReady: (result: OnReadyResult) => void
      const mockReadyPromise: Promise<OnReadyResult> = new Promise(res => {
        resolveInnerClientOnReady = res
      })
      mockInnerClientOnReady.mockReturnValueOnce(mockReadyPromise)
      const instance = createInstance(config)
      instance.setUser({
        id: 'user999',
      })
      resolveInnerClientOnReady!({ success: true })
      const result = await instance.onReady()
      expect(result.success).toBe(true)
    })
  })

  describe('setUser', () => {
    it('updates the user object with id and attributes', () => {
      const instance = createInstance(config)
      instance.setUser({
        id: 'xxfueaojfe8&86',
        attributes: {
          foo: 'bar',
        },
      })
      expect(instance.user).toEqual({
        id: 'xxfueaojfe8&86',
        attributes: {
          foo: 'bar',
        },
      })
    })

    it('adds and removes update handlers', () => {
      const instance = createInstance(config)
      const onUserUpdateListener = jest.fn()
      const dispose = instance.onUserUpdate(onUserUpdateListener)
      instance.setUser({
        id: 'newUser',
      })
      expect(onUserUpdateListener).toBeCalledTimes(1)
      expect(onUserUpdateListener).toBeCalledWith({
        id: 'newUser',
        attributes: {},
      })
      dispose()
      instance.setUser({
        id: 'newUser2',
      })
      expect(onUserUpdateListener).toBeCalledTimes(1)
    })

    describe('pre-set user and user overrides', () => {
      let instance: ReactSDKClient
      beforeEach(() => {
        instance = createInstance(config)
        instance.setUser({
          id: 'user1',
          attributes: {
            foo: 'bar',
          },
        })
        const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock
        mockFn.mockReturnValue([
          'feat1',
          'feat2',
        ])
      })

      it('can use pre-set and override user for activate', () => {
        const mockFn = mockInnerClient.activate as jest.Mock
        mockFn.mockReturnValue('var1')
        let result = instance.activate('exp1')
        expect(result).toBe('var1')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user1', { foo: 'bar' })
        mockFn.mockReset()
        mockFn.mockReturnValue('var2')
        result = instance.activate('exp1', 'user2', { bar: 'baz' })
        expect(result).toBe('var2')
        expect(mockInnerClient.activate).toBeCalledTimes(1)
        expect(mockInnerClient.activate).toBeCalledWith('exp1', 'user2', { bar: 'baz' })
      })

      it('can use pre-set and override user for track', () => {
        const mockFn = mockInnerClient.track as jest.Mock
        instance.track('evt1')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'evt1',
          'user1',
          { foo: 'bar' },
          undefined,
        )
        mockFn.mockReset()

        instance.track('evt1', 'user2', { bar: 'baz' })
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'evt1',
          'user2',
          { bar: 'baz' },
          undefined,
        )
        mockFn.mockReset()

        // Use pre-set user with event tags
        instance.track('evt1', { tagKey: 'tagVal' })
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'evt1',
          'user1',
          { foo: 'bar' },
          { tagKey: 'tagVal' },
        )
        mockFn.mockReset()

        // Use overrides with event tags
        instance.track('evt1', 'user3', { bla: 'bla' }, { tagKey: 'tagVal' })
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'evt1',
          'user3',
          { bla: 'bla' },
          { tagKey: 'tagVal' },
        )
      })

      it('can use pre-set and override user for isFeatureEnabled', () => {
        const mockFn = mockInnerClient.isFeatureEnabled as jest.Mock
        mockFn.mockReturnValue(true)
        let result = instance.isFeatureEnabled('feat1')
        expect(result).toBe(true)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('feat1', 'user1', {
          foo: 'bar',
        })
        mockFn.mockReset()
        mockFn.mockReturnValue(false)
        result = instance.isFeatureEnabled('feat1', 'user2', { bar: 'baz' })
        expect(result).toBe(false)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('feat1', 'user2', {
          bar: 'baz',
        })
      })

      it('can use pre-set and override user for getEnabledFeatures', () => {
        const mockFn = mockInnerClient.getEnabledFeatures as jest.Mock
        mockFn.mockReturnValue(['feat1'])
        let result = instance.getEnabledFeatures()
        expect(result).toEqual(['feat1'])
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('user1', {
          foo: 'bar',
        })
        mockFn.mockReset()
        mockFn.mockReturnValue([
          'feat1',
          'feat2',
        ])
        result = instance.getEnabledFeatures('user2', { bar: 'baz' })
        expect(result).toEqual(['feat1', 'feat2'])
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('user2', {
          bar: 'baz',
        })
      })

      it('can use pre-set and override user for getVariation', () => {
        const mockFn =  mockInnerClient.getVariation as jest.Mock
        mockFn.mockReturnValue('var1')
        let result = instance.getVariation('exp1')
        expect(result).toEqual('var1')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user1', {
          foo: 'bar',
        })
        mockFn.mockReset()
        mockFn.mockReturnValue('var2')
        result = instance.getVariation('exp1', 'user2', { bar: 'baz' })
        expect(result).toEqual('var2')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user2', {
          bar: 'baz',
        })
      })

      it('can use pre-set and override user for getFeatureVariableBoolean', () => {
        const mockFn = mockInnerClient.getFeatureVariableBoolean as jest.Mock
        mockFn.mockReturnValue(false)
        let result = instance.getFeatureVariableBoolean('feat1', 'bvar1')
        expect(result).toBe(false)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'bvar1',
          'user1',
          { foo: 'bar' },
        )
        mockFn.mockReset()
        mockFn.mockReturnValue(true)
        result = instance.getFeatureVariableBoolean('feat1', 'bvar1', 'user2', {
          bar: 'baz',
        })
        expect(result).toBe(true)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'bvar1',
          'user2',
          { bar: 'baz' },
        )
      })

      it('can use pre-set and override user for getFeatureVariableString', () => {
        const mockFn = mockInnerClient.getFeatureVariableString as jest.Mock
        mockFn.mockReturnValue(
          'varval1',
        )
        let result = instance.getFeatureVariableString('feat1', 'svar1')
        expect(result).toBe('varval1')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'svar1',
          'user1',
          { foo: 'bar' },
        )
        mockFn.mockReset()
        mockFn.mockReturnValue(
          'varval2',
        )
        result = instance.getFeatureVariableString('feat1', 'svar1', 'user2', {
          bar: 'baz',
        })
        expect(result).toBe('varval2')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'svar1',
          'user2',
          { bar: 'baz' },
        )
      })

      it('can use pre-set and override user for getFeatureVariableInteger', () => {
        const mockFn = mockInnerClient.getFeatureVariableInteger as jest.Mock
        mockFn.mockReturnValue(15)
        let result = instance.getFeatureVariableInteger('feat1', 'ivar1')
        expect(result).toBe(15)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'ivar1',
          'user1',
          { foo: 'bar' },
        )
        mockFn.mockReset()
        mockFn.mockReturnValue(-20)
        result = instance.getFeatureVariableInteger('feat1', 'ivar1', 'user2', {
          bar: 'baz',
        })
        expect(result).toBe(-20)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'ivar1',
          'user2',
          { bar: 'baz' },
        )
      })

      it('can use pre-set and override user for getFeatureVariableDouble', () => {
        const mockFn = mockInnerClient.getFeatureVariableDouble as jest.Mock
        mockFn.mockReturnValue(15.5)
        let result = instance.getFeatureVariableDouble('feat1', 'dvar1')
        expect(result).toBe(15.5)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith(
          'feat1',
          'dvar1',
          'user1',
          { foo: 'bar' },
        )
        mockFn.mockReset()
        mockFn.mockReturnValue(-20.2)
        result = instance.getFeatureVariableDouble('feat1', 'dvar1', 'user2', {
          bar: 'baz',
        })
        expect(result).toBe(-20.2)
        expect(mockInnerClient.getFeatureVariableDouble).toBeCalledTimes(1)
        expect(mockInnerClient.getFeatureVariableDouble).toBeCalledWith(
          'feat1',
          'dvar1',
          'user2',
          { bar: 'baz' },
        )
      })

      it('can use pre-set and override user for setForcedVariation', () => {
        const mockFn = mockInnerClient.setForcedVariation as jest.Mock
        mockFn.mockReturnValue(true)
        let result = instance.setForcedVariation('exp1', 'var1')
        expect(result).toBe(true)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user1', 'var1')

        mockFn.mockReset()
        mockFn.mockReturnValue(false)
        result = instance.setForcedVariation('exp1', 'user2', 'var1')
        expect(result).toBe(false)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user2', 'var1')
      })

      it('can use pre-set and override user for getForcedVariation', () => {
        const mockFn = mockInnerClient.getForcedVariation as jest.Mock
        mockFn.mockReturnValue('var1')
        let result = instance.getForcedVariation('exp1')
        expect(result).toBe('var1')
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user1')

        mockFn.mockReset()
        mockFn.mockReturnValue(null)
        result = instance.getForcedVariation('exp1', 'user2')
        expect(result).toBe(null)
        expect(mockFn).toBeCalledTimes(1)
        expect(mockFn).toBeCalledWith('exp1', 'user2')
      })
    })

    describe('getFeatureVariables', () => {
      it('returns an empty object when the inner SDK returns no variables', () => {
        const anyClient = mockInnerClient as any
        anyClient.getFeatureVariableBoolean.mockReturnValue(null)
        anyClient.getFeatureVariableString.mockReturnValue(null)
        anyClient.getFeatureVariableInteger.mockReturnValue(null)
        anyClient.getFeatureVariableDouble.mockReturnValue(null)
        const instance = createInstance(config)
        const result = instance.getFeatureVariables('feat1')
        expect(result).toEqual({})
      })

      it('returns an object with variables of all types returned from the inner sdk ', () => {
        const anyClient = mockInnerClient as any
        anyClient.projectConfigManager = {
          getConfig() {
            return {
              featureKeyMap: {
                feat1: {
                  variables: [
                    {
                      type: 'boolean',
                      key: 'bvar',
                    },
                    {
                      type: 'string',
                      key: 'svar',
                    },
                    {
                      type: 'integer',
                      key: 'ivar',
                    },
                    {
                      type: 'double',
                      key: 'dvar',
                    },
                  ],
                },
              },
            }
          },
        }
        anyClient.getFeatureVariableBoolean.mockReturnValue(true)
        anyClient.getFeatureVariableString.mockReturnValue(
          'whatsup',
        )
        anyClient.getFeatureVariableInteger.mockReturnValue(10)
        anyClient.getFeatureVariableDouble.mockReturnValue(-10.5)
        const instance = createInstance(config)
        instance.setUser({
          id: 'user1123',
        })
        const result = instance.getFeatureVariables('feat1')
        expect(result).toEqual({
          bvar: true,
          svar: 'whatsup',
          ivar: 10,
          dvar: -10.5,
        })
      })
    })
  })
})
