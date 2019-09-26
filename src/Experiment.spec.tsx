/**
 * Copyright 2018-2019, Optimizely
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
/// <reference types="jest" />
import * as React from 'react'
import * as Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
Enzyme.configure({ adapter: new Adapter() })

import { OptimizelyExperiment } from './Experiment'

import { mount } from 'enzyme'
import { OptimizelyProvider } from './Provider'
import { ReactSDKClient } from './client'
import { OptimizelyVariation } from './Variation'

describe('<OptimizelyExperiment>', () => {
  const variationKey = 'variationResult'
  let resolver: any
  let optimizelyMock: ReactSDKClient

  beforeEach(() => {
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    })

    optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      activate: jest.fn().mockImplementation(experimentKey => variationKey),
      onUserUpdate: jest.fn().mockImplementation(handler => () => {}),
      notificationCenter: {
        addNotificationListener: jest.fn().mockImplementation((type, handler) => {}),
        removeNotificationListener: jest.fn().mockImplementation(id => {}),
      },
      user: {
        id: 'testuser',
        attributes: {},
      },
    } as unknown) as ReactSDKClient
  })

  it('throws an error when not rendered in the context of an OptimizelyProvider', () => {
    expect(() => {
      // @ts-ignore
      mount(
        <OptimizelyExperiment experiment="experiment1">
          {variation => variation}
        </OptimizelyExperiment>,
      )
    }).toThrow()
  })

  describe('when isServerSide prop is false', () => {
    it('should wait until onReady() is resolved then render result of activate', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1">
            {variation => variation}
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 })
      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ sucess: true })

      await optimizelyMock.onReady()

      component.update()

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')
      expect(component.text()).toBe(variationKey)
    })

    it('should allow timeout to be overridden', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" timeout={200}>
            {variation => variation}
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 })
      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ sucess: true })

      await optimizelyMock.onReady()

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')
    })

    it(`should use the Experiment prop's timeout when there is no timeout passed to <Provider>`, async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1" timeout={200}>
            {variation => variation}
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 })
      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ success: true })

      await optimizelyMock.onReady()

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')
    })

    it('should render using <OptimizelyVariation> when the variationKey matches', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              other variation
            </OptimizelyVariation>
            <OptimizelyVariation variation="variationResult">
              correct variation
            </OptimizelyVariation>
            <OptimizelyVariation default>default variation</OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ success: true })

      await optimizelyMock.onReady()

      component.update()

      expect(component.text()).toBe('correct variation')
    })

    it('should render using <OptimizelyVariation default>', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              other variation
            </OptimizelyVariation>
            <OptimizelyVariation default>default variation</OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ success: true })

      await optimizelyMock.onReady()

      component.update()

      expect(component.text()).toBe('default variation')
    })

    it('should render an empty string when no default or matching variation is provided', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              other variation
            </OptimizelyVariation>
            <OptimizelyVariation variation="otherVariation2">
              other variation 2
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ success: true })

      await optimizelyMock.onReady()

      expect(component.text()).toBe('')
    })

    describe('when the onReady() promise return { sucess: false }', () => {
      it('should still render', async () => {
        const component = mount(
          <OptimizelyProvider optimizely={optimizelyMock}>
            <OptimizelyExperiment experiment="experiment1">
              <OptimizelyVariation variation="otherVariation">
                other variation
              </OptimizelyVariation>
              <OptimizelyVariation variation="otherVariation2">
                other variation 2
              </OptimizelyVariation>
            </OptimizelyExperiment>
          </OptimizelyProvider>,
        )

        // while it's waiting for onReady()
        expect(component.text()).toBe('')
        resolver.resolve({ success: false, reason: 'fail' })

        await optimizelyMock.onReady()

        expect(component.text()).toBe('')
      })
    })
  })

  describe('when autoUpdate prop is true', () => {
    it('should re-render when the OPTIMIZELY_CONFIG_UDPATE notification fires', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" autoUpdate={true}>
            {variation => variation}
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 })
      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ success: true })

      await optimizelyMock.onReady()

      component.update()

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')

      expect(component.text()).toBe('variationResult')

      // capture the OPTIMIZELY_CONFIG_UPDATE function
      const updateFn = (optimizelyMock.notificationCenter
          .addNotificationListener as jest.Mock).mock.calls[0][1]
        // change the return value of activate
      const mockActivate = optimizelyMock.activate as jest.Mock
      mockActivate.mockImplementationOnce(
        () => 'newVariation',
      )

      updateFn()
      expect(optimizelyMock.activate).toBeCalledTimes(2)

      component.update()

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')
      expect(component.text()).toBe('newVariation')
    })

    it('should re-render when the user changes', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" autoUpdate={true}>
            {variation => variation}
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 })
      // while it's waiting for onReady()
      expect(component.text()).toBe('')
      resolver.resolve({ success: true })

      await optimizelyMock.onReady()

      component.update()

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')

      expect(component.text()).toBe('variationResult')

      // capture the onUserUpdate function
      const updateFn = (optimizelyMock.onUserUpdate as jest.Mock).mock.calls[0][0]
      const mockActivate = optimizelyMock.activate as jest.Mock
      mockActivate.mockImplementationOnce(
        () => 'newVariation',
      )
      updateFn()

      component.update()

      expect(optimizelyMock.activate).toBeCalledTimes(2)

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1')
      expect(component.text()).toBe('newVariation')
    })
  })

  describe('when the isServerSide prop is true', () => {
    it('should immediately render the result of the experiment without waiting', async () => {
      const component = mount(
        <OptimizelyProvider
          optimizely={optimizelyMock}
          timeout={100}
          isServerSide={true}
        >
          <OptimizelyExperiment experiment="experiment1">
            {variation => variation}
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(component.text()).toBe(variationKey)
    })

    it('should render using <OptimizelyVariation> when the variationKey matches', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} isServerSide={true}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              other variation
            </OptimizelyVariation>
            <OptimizelyVariation variation="variationResult">
              correct variation
            </OptimizelyVariation>
            <OptimizelyVariation default>default variation</OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>,
      )

      expect(component.text()).toBe('correct variation')
    })
  })
})
