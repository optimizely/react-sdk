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
import * as Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';
import { act } from 'react-dom/test-utils';

import { OptimizelyProvider } from './Provider';
import { ReactSDKClient } from './client';
import { useFeature } from './hooks';

Enzyme.configure({ adapter: new Adapter() });

const MyComponent = () => {
  const [ isEnabled ] = useFeature('feature1');
  return <>{`${isEnabled ? 'true' : 'false'}`}</>;
}

const MyComponentAutoUpdate = () => {
  const [ isEnabled ] = useFeature('feature1', { autoUpdate: true });
  console.log('MyComponentAutoUpdate rendering: ', isEnabled);
  return <>{`${isEnabled ? 'true' : 'false'}`}</>;
}

describe('hooks', () => {
  const featureVariables = {
    foo: 'bar',
  };
  let isFeatureEnabledMock: jest.Mock;
  let resolver: any;
  let optimizelyMock: ReactSDKClient;
  let userUpdateCallbacks: Array<() => void>;
  let notificationListenerCallbacks: Array<() => void>;
  
  beforeEach(() => {
    const onReadyPromise = new Promise((resolve, reject) => {
      resolver = {
        reject,
        resolve,
      }
    });

    isFeatureEnabledMock = jest.fn();
    userUpdateCallbacks = [];
    notificationListenerCallbacks = [];

    optimizelyMock = ({
      onReady: jest.fn().mockImplementation(config => onReadyPromise),
      getFeatureVariables: jest.fn().mockImplementation(() => featureVariables),
      isFeatureEnabled: isFeatureEnabledMock,
      onUserUpdate: jest.fn().mockImplementation(handler => {
        userUpdateCallbacks.push(handler);
        return () => {};
      }),
      notificationCenter: {
        addNotificationListener: jest.fn().mockImplementation((type, handler) => {
          notificationListenerCallbacks.push(handler);
        }),
        removeNotificationListener: jest.fn().mockImplementation(id => {}),
      },
      user: {
        id: 'testuser',
        attributes: {},
      },
    } as unknown) as ReactSDKClient
  })

  describe('useFeature', () => {
    it('should render true when the feature is enabled', async () => {
      isFeatureEnabledMock.mockReturnValue(true);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyComponent />
        </OptimizelyProvider>,
      )
      resolver.resolve({ success: true });
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('true')
    });

    it('should render false when the feature is disabled', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyComponent />
        </OptimizelyProvider>,
      );
      resolver.resolve({ success: true });
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('false');
    });

    it('should re-render when the user attributes change using autoUpdate', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyComponentAutoUpdate />
        </OptimizelyProvider>,
      );
      resolver.resolve({ success: true });

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('false');

      isFeatureEnabledMock.mockReturnValue(true);      
      // Simulate the user object changing
      act(() => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      component.update();
      expect(component.text()).toBe('true');
    });
  });
});
