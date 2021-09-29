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
import * as React from 'react';
import * as Enzyme from 'enzyme';
import { act } from 'react-dom/test-utils';
import Adapter from 'enzyme-adapter-react-16';
Enzyme.configure({ adapter: new Adapter() });

import { mount } from 'enzyme';
import { OptimizelyProvider } from './Provider';
import { ReactSDKClient } from './client';
import { OptimizelyFeature } from './Feature';

describe('<OptimizelyFeature>', () => {
  let resolver: any;
  let optimizelyMock: ReactSDKClient;
  const isEnabledMock = true;
  let isReady: boolean;
  const featureVariables = {
    foo: 'bar',
  };

  beforeEach(() => {
    isReady = false;
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      };
    });

    optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      getFeatureVariables: jest.fn().mockImplementation(() => featureVariables),
      isFeatureEnabled: jest.fn().mockImplementation(() => isEnabledMock),
      onUserUpdate: jest.fn().mockImplementation(handler => () => {}),
      notificationCenter: {
        addNotificationListener: jest.fn().mockImplementation((type, handler) => {}),
        removeNotificationListener: jest.fn().mockImplementation(id => {}),
      },
      user: {
        id: 'testuser',
        attributes: {},
      },
      isReady: jest.fn().mockImplementation(() => isReady),
      getIsReadyPromiseFulfilled: () => true,
      getIsUsingSdkKey: () => true,
    } as unknown) as ReactSDKClient;
  });
  it('throws an error when not rendered in the context of an OptimizelyProvider', () => {
    expect(() => {
      // @ts-ignore
      mount(<OptimizelyFeature feature="feature1">{(isEnabled, variables) => isEnabled}</OptimizelyFeature>);
    }).toThrow();
  });

  describe('when the isServerSide prop is false', () => {
    it('should wait until onReady() is resolved then render result of isFeatureEnabled and getFeatureVariables', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyFeature feature="feature1">
            {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
          </OptimizelyFeature>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: undefined });

      // while it's waiting for onReady()
      expect(component.text()).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      component.update();

      expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(component.text()).toBe('true|bar');
    });

    it('should respect the timeout provided in <OptimizelyProvider>', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
          <OptimizelyFeature feature="feature1">
            {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
          </OptimizelyFeature>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

      // while it's waiting for onReady()
      expect(component.text()).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      component.update();

      expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(component.text()).toBe('true|bar');
    });

    it('should pass the values for clientReady and didTimeout', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
          <OptimizelyFeature feature="feature1" timeout={100}>
            {(isEnabled, variables, clientReady, didTimeout) =>
              `${isEnabled ? 'true' : 'false'}|${variables.foo}|${clientReady}|${didTimeout}`
            }
          </OptimizelyFeature>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(component.text()).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      component.update();

      expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(component.text()).toBe('true|bar|true|false');
    });

    it('should respect a locally passed timeout prop', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
          <OptimizelyFeature feature="feature1" timeout={100}>
            {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
          </OptimizelyFeature>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(component.text()).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      component.update();

      expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
      expect(component.text()).toBe('true|bar');
    });

    it('should pass the override props through', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
          <OptimizelyFeature feature="feature1" overrideUserId="james123" overrideAttributes={{ betaUser: true }}>
            {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
          </OptimizelyFeature>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(component.text()).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      component.update();

      expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', 'james123', { betaUser: true });
      expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', 'james123', { betaUser: true });
      expect(component.text()).toBe('true|bar');
    });

    describe(`when the "autoUpdate" prop is true`, () => {
      it('should update when the OPTIMIZELY_CONFIG_UPDATE handler is called', async () => {
        const component = mount(
          <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
            <OptimizelyFeature feature="feature1" autoUpdate={true}>
              {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
            </OptimizelyFeature>
          </OptimizelyProvider>
        );

        expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

        // while it's waiting for onReady()
        expect(component.text()).toBe('');

        // Simulate client becoming ready
        resolver.resolve({ success: true });

        isReady = true;
        await act(async () => await optimizelyMock.onReady());

        component.update();

        expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
        expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
        expect(component.text()).toBe('true|bar');

        // change the return value of activate
        const mockIFE = optimizelyMock.isFeatureEnabled as jest.Mock;
        mockIFE.mockImplementationOnce(() => false);
        const mockGFV = optimizelyMock.getFeatureVariables as jest.Mock;
        mockGFV.mockImplementationOnce(() => ({
          foo: 'baz',
        }));

        const updateFn = (optimizelyMock.notificationCenter.addNotificationListener as jest.Mock).mock.calls[0][1];
        act(updateFn);

        component.update();

        expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledTimes(2);
        expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledTimes(2);

        expect(component.text()).toBe('false|baz');
      });

      it('should update when the user changes', async () => {
        const component = mount(
          <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
            <OptimizelyFeature feature="feature1" autoUpdate={true}>
              {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
            </OptimizelyFeature>
          </OptimizelyProvider>
        );

        expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

        // while it's waiting for onReady()
        expect(component.text()).toBe('');

        // Simulate client becoming ready
        resolver.resolve({ success: true });

        isReady = true;
        await act(async () => await optimizelyMock.onReady());

        component.update();

        expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
        expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
        expect(component.text()).toBe('true|bar');

        const updateFn = (optimizelyMock.onUserUpdate as jest.Mock).mock.calls[0][0];
        const mockIFE = optimizelyMock.isFeatureEnabled as jest.Mock;
        mockIFE.mockImplementationOnce(() => false);
        const mockGFV = optimizelyMock.getFeatureVariables as jest.Mock;
        mockGFV.mockImplementationOnce(() => ({
          foo: 'baz',
        }));

        act(updateFn);

        component.update();

        expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledTimes(2);
        expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledTimes(2);

        expect(component.text()).toBe('false|baz');
      });
    });

    describe('when the onReady() promise returns { success: false }', () => {
      it('should still render', async () => {
        const component = mount(
          <OptimizelyProvider optimizely={optimizelyMock} timeout={200}>
            <OptimizelyFeature feature="feature1">
              {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
            </OptimizelyFeature>
          </OptimizelyProvider>
        );

        expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

        // while it's waiting for onReady()
        expect(component.text()).toBe('');
        resolver.resolve({ success: false, reason: 'fail', dataReadyPromise: Promise.resolve() });

        // Simulate config update notification firing after datafile fetched
        await optimizelyMock.onReady().then(res => res.dataReadyPromise);

        component.update();

        expect(optimizelyMock.isFeatureEnabled).toHaveBeenCalledWith('feature1', undefined, undefined);
        expect(optimizelyMock.getFeatureVariables).toHaveBeenCalledWith('feature1', undefined, undefined);
        expect(component.text()).toBe('true|bar');
      });
    });
  });

  describe('when the isServerSide prop is true', () => {
    it('should immediately render the result of isFeatureEnabled and getFeatureVariables', async () => {
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyMock} isServerSide={true}>
          <OptimizelyFeature feature="feature1">
            {(isEnabled, variables) => `${isEnabled ? 'true' : 'false'}|${variables.foo}`}
          </OptimizelyFeature>
        </OptimizelyProvider>
      );

      expect(component.text()).toBe('true|bar');
    });
  });
});
