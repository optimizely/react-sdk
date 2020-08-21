/**
 * Copyright 2020, Optimizely
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
import { OnReadyResult, ReactSDKClient, VariableValuesObject } from './client';
import { useExperiment, useFeature } from './hooks';

Enzyme.configure({ adapter: new Adapter() });

const MyFeatureComponent = ({ options = {}, overrides = {} }: any) => {
  const [isEnabled, variables, clientReady, didTimeout] = useFeature('feature1', { ...options }, { ...overrides });
  return <>{`${isEnabled ? 'true' : 'false'}|${JSON.stringify(variables)}|${clientReady}|${didTimeout}`}</>;
};

const MyExperimentComponent = ({ options = {}, overrides = {} }: any) => {
  const [variation, clientReady, didTimeout] = useExperiment('experiment1', { ...options }, { ...overrides });
  return <>{`${variation}|${clientReady}|${didTimeout}`}</>;
};

const mockFeatureVariables: VariableValuesObject = {
  foo: 'bar',
};

describe('hooks', () => {
  let activateMock: jest.Mock;
  let featureVariables: VariableValuesObject;
  let getOnReadyPromise: any;
  let isFeatureEnabledMock: jest.Mock;
  let mockDelay: number;
  let notificationListenerCallbacks: Array<() => void>;
  let optimizelyMock: ReactSDKClient;
  let readySuccess: boolean;
  let userUpdateCallbacks: Array<() => void>;
  let LoggingComponent: React.FunctionComponent<any>;
  let mockLog: jest.Mock;

  beforeEach(() => {
    getOnReadyPromise = ({ timeout = 0 }: any): Promise<OnReadyResult> =>
      new Promise(resolve => {
        setTimeout(function() {
          resolve(
            Object.assign(
              {
                success: readySuccess,
              },
              !readySuccess && {
                dataReadyPromise: new Promise(r => setTimeout(r, mockDelay)),
              }
            )
          );
        }, timeout || mockDelay);
      });

    activateMock = jest.fn();
    isFeatureEnabledMock = jest.fn();
    featureVariables = mockFeatureVariables;
    userUpdateCallbacks = [];
    mockDelay = 10;
    readySuccess = true;
    notificationListenerCallbacks = [];

    optimizelyMock = ({
      activate: activateMock,
      onReady: jest.fn().mockImplementation(config => getOnReadyPromise(config || {})),
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
      isReady: () => readySuccess,
    } as unknown) as ReactSDKClient;

    mockLog = jest.fn();
    LoggingComponent = ({ options = {}, overrides = {} }: any) => {
      const [variation] = useExperiment('experiment1', { ...options }, { ...overrides });
      mockLog(variation);
      return <div>{variation}</div>;
    };
  });

  afterEach(async () => {
    await optimizelyMock.onReady().then(
      res => res.dataReadyPromise,
      err => null
    );
  });

  describe('useExperiment', () => {
    it('should return a variation when activate returns a variation', async () => {
      activateMock.mockReturnValue('12345');
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('12345|true|false');
    });

    it('should return null when activate returns null', async () => {
      activateMock.mockReturnValue(null);
      featureVariables = {};
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('null|true|false');
    });

    it('should respect the timeout option passed', async () => {
      activateMock.mockReturnValue('12345');
      readySuccess = false;
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );
      expect(component.text()).toBe('null|false|false'); // initial render
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('null|false|true'); // when didTimeout
      readySuccess = true;
      // Simulate CONFIG_UPDATE notification, causing decision state to recompute
      notificationListenerCallbacks[0]();
      await optimizelyMock.onReady().then(res => res.dataReadyPromise);
      component.update();
      expect(component.text()).toBe('12345|true|true'); // when clientReady
    });

    it('should gracefully handle the client promise rejecting after timeout', async () => {
      readySuccess = false;
      activateMock.mockReturnValue('12345');
      getOnReadyPromise = () =>
        new Promise((res, rej) => {
          setTimeout(() => rej('some error with user'), mockDelay);
        });
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );
      expect(component.text()).toBe('null|false|false'); // initial render
      await new Promise(r => setTimeout(r, mockDelay * 3));
      component.update();
      expect(component.text()).toBe('null|false|false');
    });

    it('should re-render when the user attributes change using autoUpdate', async () => {
      activateMock.mockReturnValue(null);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('null|true|false');

      activateMock.mockReturnValue('12345');
      // Simulate the user object changing
      act(() => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      component.update();
      expect(component.text()).toBe('12345|true|false');
    });

    it('should not re-render when the user attributes change without autoUpdate', async () => {
      activateMock.mockReturnValue(null);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('null|true|false');

      activateMock.mockReturnValue('12345');
      // Simulate the user object changing
      act(() => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      component.update();
      expect(component.text()).toBe('null|true|false');
    });

    it('should return the variation immediately on the first call when the client is already ready', async () => {
      readySuccess = true;
      activateMock.mockReturnValue('12345');
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <LoggingComponent />
        </OptimizelyProvider>
      );
      component.update();
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith('12345');
    });

    it('should re-render after the client becomes ready and triggers a config update notification', async () => {
      readySuccess = false;
      let resolveReadyPromise: (result: { success: boolean; dataReadyPromise: Promise<any> }) => void;
      const readyPromise: Promise<any> = new Promise(res => {
        resolveReadyPromise = (result): void => {
          readySuccess = true;
          res(result);
        };
      });
      getOnReadyPromise = (): Promise<any> => readyPromise;
      activateMock.mockReturnValue(null);

      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <LoggingComponent />
        </OptimizelyProvider>
      );
      component.update();

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(null);

      mockLog.mockReset();
      activateMock.mockReturnValue('12345');
      // Simulate CONFIG_UPDATE notification, causing decision state to recompute
      notificationListenerCallbacks[0]();
      resolveReadyPromise!({ success: true, dataReadyPromise: Promise.resolve() });
      component.update();

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith('12345');
    });

    it('should re-render after updating the override user ID argument', async () => {
      activateMock.mockReturnValue(null);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      component.update();
      expect(component.text()).toBe('null|true|false');

      activateMock.mockReturnValue('12345');
      component.setProps({
        children: <MyExperimentComponent options={{ autoUpdate: true }} overrides={{ overrideUserId: 'matt' }} />,
      });
      component.update();
      expect(component.text()).toBe('12345|true|false');
    });

    it('should re-render after updating the override user attributes argument', async () => {
      activateMock.mockReturnValue(null);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      component.update();
      expect(component.text()).toBe('null|true|false');

      activateMock.mockReturnValue('12345');
      component.setProps({
        children: (
          <MyExperimentComponent options={{ autoUpdate: true }} overrides={{ overrideAttributes: { my_attr: 'x' } }} />
        ),
      });
      component.update();
      expect(component.text()).toBe('12345|true|false');
    });

    it('should not recompute the decision when passed the same override attributes', async () => {
      activateMock.mockReturnValue(null);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <LoggingComponent options={{ autoUpdate: true }} overrides={{ overrideAttributes: { other_attr: 'y' } }} />
        </OptimizelyProvider>
      );
      expect(activateMock).toHaveBeenCalledTimes(1);
      activateMock.mockReset();
      component.setProps({
        children: (
          <LoggingComponent options={{ autoUpdate: true }} overrides={{ overrideAttributes: { other_attr: 'y' } }} />
        ),
      });
      component.update();
      expect(activateMock).not.toHaveBeenCalled();
    });
  });

  describe('useFeature', () => {
    it('should render true when the feature is enabled', async () => {
      isFeatureEnabledMock.mockReturnValue(true);
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('true|{"foo":"bar"}|true|false');
    });

    it('should render false when the feature is disabled', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('false|{}|true|false');
    });

    it('should respect the timeout option passed', async () => {
      isFeatureEnabledMock.mockReturnValue(true);
      readySuccess = false;
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );
      expect(component.text()).toBe('false|{}|false|false'); // initial render
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('false|{}|false|true'); // when didTimeout
      readySuccess = true;
      // Simulate CONFIG_UPDATE notification, causing decision state to recompute
      notificationListenerCallbacks[0]();
      await optimizelyMock.onReady().then(res => res.dataReadyPromise);
      component.update();
      expect(component.text()).toBe('true|{"foo":"bar"}|true|true'); // when clientReady
    });

    it('should gracefully handle the client promise rejecting after timeout', async () => {
      readySuccess = false;
      isFeatureEnabledMock.mockReturnValue(true);
      getOnReadyPromise = () =>
        new Promise((res, rej) => {
          setTimeout(() => rej('some error with user'), mockDelay);
        });
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );
      expect(component.text()).toBe('false|{}|false|false'); // initial render
      await new Promise(r => setTimeout(r, mockDelay * 3));
      component.update();
      expect(component.text()).toBe('false|{}|false|false');
    });

    it('should re-render when the user attributes change using autoUpdate', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('false|{}|true|false');

      isFeatureEnabledMock.mockReturnValue(true);
      featureVariables = mockFeatureVariables;
      // Simulate the user object changing
      act(() => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      component.update();
      expect(component.text()).toBe('true|{"foo":"bar"}|true|false');
    });

    it('should not re-render when the user attributes change without autoUpdate', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};
      const component = Enzyme.mount(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      component.update();
      expect(component.text()).toBe('false|{}|true|false');

      isFeatureEnabledMock.mockReturnValue(true);
      featureVariables = mockFeatureVariables;
      // Simulate the user object changing
      act(() => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      component.update();
      expect(component.text()).toBe('false|{}|true|false');
    });
  });
});
