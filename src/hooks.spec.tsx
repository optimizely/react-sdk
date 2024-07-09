/**
 * Copyright 2022, 2023, 2024 Optimizely
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

/// <reference types="jest" />

import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { OptimizelyProvider } from './Provider';
import { OnReadyResult, ReactSDKClient, VariableValuesObject } from './client';
import { useExperiment, useFeature, useDecision, useTrackEvent, hooksLogger } from './hooks';
import { OptimizelyDecision } from './utils';
const defaultDecision: OptimizelyDecision = {
  enabled: false,
  variables: {},
  flagKey: '',
  reasons: [],
  ruleKey: '',
  userContext: { id: null },
  variationKey: '',
};

const MyFeatureComponent = ({ options = {}, overrides = {} }: any) => {
  const [isEnabled, variables, clientReady, didTimeout] = useFeature('feature1', { ...options }, { ...overrides });
  return (
    <span data-testid="result">{`${isEnabled ? 'true' : 'false'}|${JSON.stringify(
      variables
    )}|${clientReady}|${didTimeout}`}</span>
  );
};

const MyExperimentComponent = ({ options = {}, overrides = {} }: any) => {
  const [variation, clientReady, didTimeout] = useExperiment('experiment1', { ...options }, { ...overrides });
  return <span data-testid="result">{`${variation}|${clientReady}|${didTimeout}`}</span>;
};

const MyDecideComponent = ({ options = {}, overrides = {} }: any) => {
  const [decision, clientReady, didTimeout] = useDecision('feature1', { ...options }, { ...overrides });
  return (
    <span data-testid="result">{`${decision.enabled ? 'true' : 'false'}|${JSON.stringify(
      decision.variables
    )}|${clientReady}|${didTimeout}`}</span>
  );
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
  let UseExperimentLoggingComponent: React.FunctionComponent<any>;
  let UseFeatureLoggingComponent: React.FunctionComponent<any>;
  let UseDecisionLoggingComponent: React.FunctionComponent<any>;
  let mockLog: jest.Mock;
  let forcedVariationUpdateCallbacks: Array<() => void>;
  let decideMock: jest.Mock<OptimizelyDecision>;
  let setForcedDecisionMock: jest.Mock<void>;
  let hooksLoggerErrorSpy: jest.SpyInstance;
  const REJECTION_REASON = 'A rejection reason you should never see in the test runner';

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
    forcedVariationUpdateCallbacks = [];
    decideMock = jest.fn();
    setForcedDecisionMock = jest.fn();
    hooksLoggerErrorSpy = jest.spyOn(hooksLogger, 'error');
    optimizelyMock = ({
      activate: activateMock,
      onReady: jest.fn().mockImplementation(config => getOnReadyPromise(config || {})),
      getFeatureVariables: jest.fn().mockImplementation(() => featureVariables),
      isFeatureEnabled: isFeatureEnabledMock,
      getVuid: jest.fn().mockReturnValue('vuid_95bf72cebc774dfd8e8e580a5a1'),
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
      getIsReadyPromiseFulfilled: () => true,
      getIsUsingSdkKey: () => true,
      onForcedVariationsUpdate: jest.fn().mockImplementation(handler => {
        forcedVariationUpdateCallbacks.push(handler);
        return () => {};
      }),
      getForcedVariations: jest.fn().mockReturnValue({}),
      decide: decideMock,
      setForcedDecision: setForcedDecisionMock,
      track: jest.fn(),
    } as unknown) as ReactSDKClient;

    mockLog = jest.fn();
    UseExperimentLoggingComponent = ({ options = {}, overrides = {} }: any) => {
      const [variation] = useExperiment('experiment1', { ...options }, { ...overrides });
      mockLog(variation);
      return <div>{variation}</div>;
    };

    UseFeatureLoggingComponent = ({ options = {}, overrides = {} }: any) => {
      const [isEnabled] = useFeature('feature1', { ...options }, { ...overrides });
      mockLog(isEnabled);
      return <div>{isEnabled}</div>;
    };

    UseDecisionLoggingComponent = ({ options = {}, overrides = {} }: any) => {
      const [decision] = useDecision('feature1', { ...options }, { ...overrides });
      decision && mockLog(decision.enabled);
      return <div>{decision && decision.enabled}</div>;
    };
  });

  afterEach(async () => {
    await optimizelyMock.onReady().then(
      res => res.dataReadyPromise,
      err => null
    );
    hooksLoggerErrorSpy.mockReset();
  });

  describe('useExperiment', () => {
    it('should return a variation when activate returns a variation', async () => {
      activateMock.mockReturnValue('12345');

      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|false'));
    });

    it('should return null when activate returns null', async () => {
      activateMock.mockReturnValue(null);
      featureVariables = {};
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));
    });

    it('should respect the timeout option passed', async () => {
      activateMock.mockReturnValue(null);
      readySuccess = false;

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|false|false')); // initial render

      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|false|true')); // when didTimeout

      // Simulate datafile fetch completing after timeout has already passed
      // Activate now returns a variation
      activateMock.mockReturnValue('12345');
      // Wait for completion of dataReadyPromise
      await optimizelyMock.onReady().then(res => res.dataReadyPromise);
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|true')); // when clientReady
    });

    it('should gracefully handle the client promise rejecting after timeout', async () => {
      jest.useFakeTimers();

      readySuccess = false;
      activateMock.mockReturnValue('12345');
      getOnReadyPromise = (): Promise<void> =>
        new Promise((_, rej) => setTimeout(() => rej(REJECTION_REASON), mockDelay));

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );

      jest.advanceTimersByTime(mockDelay + 1);

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|false|false'));

      jest.useRealTimers();
    });

    it('should re-render when the user attributes change using autoUpdate', async () => {
      activateMock.mockReturnValue(null);

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));

      activateMock.mockReturnValue('12345');
      // Simulate the user object changing
      await act(async () => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      //   component.update();
      //   await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|false');
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|false'));
    });

    it('should not re-render when the user attributes change without autoUpdate', async () => {
      activateMock.mockReturnValue(null);
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent />
        </OptimizelyProvider>
      );

      //   // TODO - Wrap this with async act() once we upgrade to React 16.9
      //   // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));

      activateMock.mockReturnValue('12345');
      // Simulate the user object changing
      await act(async () => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));
    });

    it('should return the variation immediately on the first call when the client is already ready', async () => {
      readySuccess = true;
      activateMock.mockReturnValue('12345');

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseExperimentLoggingComponent />
        </OptimizelyProvider>
      );
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith('12345');
    });

    it('should re-render after the client becomes ready', async () => {
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

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseExperimentLoggingComponent />
        </OptimizelyProvider>
      );
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(null);

      mockLog.mockReset();

      // Simulate datafile fetch completing after timeout has already passed
      // Activate now returns a variation
      activateMock.mockReturnValue('12345');
      // Wait for completion of dataReadyPromise
      const dataReadyPromise = Promise.resolve();
      resolveReadyPromise!({ success: true, dataReadyPromise });
      await dataReadyPromise;
      await waitFor(() => expect(mockLog).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockLog).toHaveBeenCalledWith('12345'));
    });

    it('should re-render after updating the override user ID argument', async () => {
      activateMock.mockReturnValue(null);

      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));

      activateMock.mockReturnValue('12345');

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} overrides={{ overrideUserId: 'matt' }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|false'));
    });

    it('should re-render after updating the override user attributes argument', async () => {
      activateMock.mockReturnValue(null);

      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));

      activateMock.mockReturnValue('12345');

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} overrides={{ overrideAttributes: { my_attr: 'x' } }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|false'));

      activateMock.mockReturnValue('67890');

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { my_attr: 'z', other_attr: 25 } }}
          />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('67890|true|false'));
    });

    it('should not recompute the decision when passed the same override attributes', async () => {
      activateMock.mockReturnValue(null);

      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseExperimentLoggingComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { other_attr: 'y' } }}
          />{' '}
        </OptimizelyProvider>
      );
      expect(activateMock).toHaveBeenCalledTimes(1);
      activateMock.mockReset();

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseExperimentLoggingComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { other_attr: 'y' } }}
          />{' '}
        </OptimizelyProvider>
      );
      expect(activateMock).not.toHaveBeenCalled();
    });

    it('should re-render after setForcedVariation is called on the client', async () => {
      activateMock.mockReturnValue(null);

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyExperimentComponent options={{ autoUpdate: true }} />{' '}
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null|true|false'));

      activateMock.mockReturnValue('12345');
      forcedVariationUpdateCallbacks[0]();

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('12345|true|false'));
    });
  });

  describe('useFeature', () => {
    it('should render true when the feature is enabled', async () => {
      isFeatureEnabledMock.mockReturnValue(true);

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|false'));
    });

    it('should render false when the feature is disabled', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });

    it('should respect the timeout option passed', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};
      readySuccess = false;

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|false|false')); // initial render

      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|false|true')); // when didTimeout

      // Simulate datafile fetch completing after timeout has already passed
      // isFeatureEnabled now returns true, getFeatureVariables returns variable values
      isFeatureEnabledMock.mockReturnValue(true);
      featureVariables = mockFeatureVariables;
      // Wait for completion of dataReadyPromise
      await optimizelyMock.onReady().then(res => res.dataReadyPromise);

      // Simulate datafile fetch completing after timeout has already passed
      // Activate now returns a variation
      activateMock.mockReturnValue('12345');
      // Wait for completion of dataReadyPromise
      await optimizelyMock.onReady().then(res => res.dataReadyPromise);
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|true')); // when clientReady
    });

    it('should gracefully handle the client promise rejecting after timeout', async () => {
      jest.useFakeTimers();

      readySuccess = false;
      isFeatureEnabledMock.mockReturnValue(true);
      getOnReadyPromise = (): Promise<void> =>
        new Promise((_, rej) => setTimeout(() => rej(REJECTION_REASON), mockDelay));

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );

      jest.advanceTimersByTime(mockDelay + 1);

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|false|false'));

      jest.useRealTimers();
    });

    it('should re-render when the user attributes change using autoUpdate', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));

      isFeatureEnabledMock.mockReturnValue(true);
      featureVariables = mockFeatureVariables;
      // Simulate the user object changing
      await act(async () => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|false'));
    });

    it('should not re-render when the user attributes change without autoUpdate', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = {};

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));

      isFeatureEnabledMock.mockReturnValue(true);
      featureVariables = mockFeatureVariables;
      // Simulate the user object changing
      act(() => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      // component.update();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });

    it('should return the variation immediately on the first call when the client is already ready', async () => {
      readySuccess = true;
      isFeatureEnabledMock.mockReturnValue(false);
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseFeatureLoggingComponent />
        </OptimizelyProvider>
      );
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(false);
    });

    it('should re-render after the client becomes ready', async () => {
      readySuccess = false;
      let resolveReadyPromise: (result: { success: boolean; dataReadyPromise: Promise<any> }) => void;
      const readyPromise: Promise<any> = new Promise(res => {
        resolveReadyPromise = (result): void => {
          readySuccess = true;
          res(result);
        };
      });
      getOnReadyPromise = (): Promise<any> => readyPromise;
      isFeatureEnabledMock.mockReturnValue(false);

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseFeatureLoggingComponent />
        </OptimizelyProvider>
      );

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(false);

      mockLog.mockReset();

      // Simulate datafile fetch completing after timeout has already passed
      // isFeatureEnabled now returns true
      isFeatureEnabledMock.mockReturnValue(true);
      // Wait for completion of dataReadyPromise
      const dataReadyPromise = Promise.resolve();
      resolveReadyPromise!({ success: true, dataReadyPromise });
      await dataReadyPromise;
      await waitFor(() => expect(mockLog).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockLog).toHaveBeenCalledWith(true));
    });

    it('should re-render after updating the override user ID argument', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{"foo":"bar"}|true|false'));

      isFeatureEnabledMock.mockReturnValue(true);

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ autoUpdate: true }} overrides={{ overrideUserId: 'matt' }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|false'));
    });

    it('should re-render after updating the override user attributes argument', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{"foo":"bar"}|true|false'));

      isFeatureEnabledMock.mockReturnValue(true);

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent options={{ autoUpdate: true }} overrides={{ overrideAttributes: { my_attr: 'x' } }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|false'));

      isFeatureEnabledMock.mockReturnValue(false);
      featureVariables = { myvar: 3 };

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyFeatureComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { my_attr: 'z', other_attr: 25 } }}
          />{' '}
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{"myvar":3}|true|false'));
    });

    it('should not recompute the decision when passed the same override attributes', async () => {
      isFeatureEnabledMock.mockReturnValue(false);
      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseFeatureLoggingComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { other_attr: 'y' } }}
          />
        </OptimizelyProvider>
      );
      expect(isFeatureEnabledMock).toHaveBeenCalledTimes(1);
      isFeatureEnabledMock.mockReset();

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseFeatureLoggingComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { other_attr: 'y' } }}
          />
        </OptimizelyProvider>
      );
      expect(isFeatureEnabledMock).not.toHaveBeenCalled();
    });
  });

  describe('useDecision', () => {
    it('should render true when the flag is enabled', async () => {
      decideMock.mockReturnValue({
        ...defaultDecision,
        enabled: true,
        variables: { foo: 'bar' },
      });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      // component.update();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|false'));
    });

    it('should render false when the flag is disabled', async () => {
      decideMock.mockReturnValue({
        ...defaultDecision,
        enabled: false,
        variables: { foo: 'bar' },
      });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent />
        </OptimizelyProvider>
      );
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{"foo":"bar"}|true|false'));
    });

    it('should respect the timeout option passed', async () => {
      decideMock.mockReturnValue({ ...defaultDecision });
      readySuccess = false;

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|false|false'));

      await optimizelyMock.onReady();
      // component.update();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|false|true'));

      // Simulate datafile fetch completing after timeout has already passed
      // flag is now true and decision contains variables
      decideMock.mockReturnValue({
        ...defaultDecision,
        enabled: true,
        variables: { foo: 'bar' },
      });

      await optimizelyMock.onReady().then(res => res.dataReadyPromise);

      // Simulate datafile fetch completing after timeout has already passed
      // Wait for completion of dataReadyPromise
      await optimizelyMock.onReady().then(res => res.dataReadyPromise);

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|true')); // when clientReady
    });

    it('should gracefully handle the client promise rejecting after timeout', async () => {
      jest.useFakeTimers();

      readySuccess = false;
      decideMock.mockReturnValue({ ...defaultDecision });
      getOnReadyPromise = (): Promise<void> =>
        new Promise((_, rej) => setTimeout(() => rej(REJECTION_REASON), mockDelay));

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ timeout: mockDelay }} />
        </OptimizelyProvider>
      );

      jest.advanceTimersByTime(mockDelay + 1);

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|false|false'));

      jest.useRealTimers();
    });

    it('should re-render when the user attributes change using autoUpdate', async () => {
      decideMock.mockReturnValue({ ...defaultDecision });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));

      decideMock.mockReturnValue({
        ...defaultDecision,
        enabled: true,
        variables: { foo: 'bar' },
      });
      // Simulate the user object changing
      await act(async () => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{"foo":"bar"}|true|false'));
    });

    it('should not re-render when the user attributes change without autoUpdate', async () => {
      decideMock.mockReturnValue({ ...defaultDecision });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent />
        </OptimizelyProvider>
      );

      // TODO - Wrap this with async act() once we upgrade to React 16.9
      // See https://github.com/facebook/react/issues/15379
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));

      decideMock.mockReturnValue({
        ...defaultDecision,
        enabled: true,
        variables: { foo: 'bar' },
      });
      // Simulate the user object changing
      await act(async () => {
        userUpdateCallbacks.forEach(fn => fn());
      });
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });

    it('should return the decision immediately on the first call when the client is already ready', async () => {
      readySuccess = true;
      decideMock.mockReturnValue({ ...defaultDecision });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseDecisionLoggingComponent />
        </OptimizelyProvider>
      );
      // component.update();
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(false);
    });

    it('should re-render after the client becomes ready', async () => {
      readySuccess = false;
      let resolveReadyPromise: (result: { success: boolean; dataReadyPromise: Promise<any> }) => void;
      const readyPromise: Promise<any> = new Promise(res => {
        resolveReadyPromise = (result): void => {
          readySuccess = true;
          res(result);
        };
      });
      getOnReadyPromise = (): Promise<any> => readyPromise;
      decideMock.mockReturnValue({ ...defaultDecision });

      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseDecisionLoggingComponent />
        </OptimizelyProvider>
      );
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(false);

      mockLog.mockReset();

      // Simulate datafile fetch completing after timeout has already passed
      // decision now returns true
      decideMock.mockReturnValue({ ...defaultDecision, enabled: true });
      // Wait for completion of dataReadyPromise
      const dataReadyPromise = Promise.resolve();
      resolveReadyPromise!({ success: true, dataReadyPromise });
      await dataReadyPromise;
      await waitFor(() => expect(mockLog).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockLog).toHaveBeenCalledWith(true));
    });

    it('should re-render after updating the override user ID argument', async () => {
      decideMock.mockReturnValue({ ...defaultDecision });
      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));

      decideMock.mockReturnValue({ ...defaultDecision, enabled: true });
      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: true }} overrides={{ overrideUserId: 'matt' }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{}|true|false'));
    });

    it('should re-render after updating the override user attributes argument', async () => {
      decideMock.mockReturnValue({ ...defaultDecision });
      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));

      decideMock.mockReturnValue({ ...defaultDecision, enabled: true });
      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: true }} overrides={{ overrideAttributes: { my_attr: 'x' } }} />
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true|{}|true|false'));

      decideMock.mockReturnValue({ ...defaultDecision, enabled: false, variables: { myvar: 3 } });
      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { my_attr: 'z', other_attr: 25 } }}
          />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{"myvar":3}|true|false'));
    });

    it('should not recompute the decision when passed the same override attributes', async () => {
      decideMock.mockReturnValue({ ...defaultDecision });
      const { rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseDecisionLoggingComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { other_attr: 'y' } }}
          />
        </OptimizelyProvider>
      );
      expect(decideMock).toHaveBeenCalledTimes(1);
      decideMock.mockReset();

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <UseDecisionLoggingComponent
            options={{ autoUpdate: true }}
            overrides={{ overrideAttributes: { other_attr: 'y' } }}
          />
        </OptimizelyProvider>
      );

      expect(decideMock).not.toHaveBeenCalled();
    });

    it('should not recompute the decision when autoupdate is not passed and setting setForcedDecision', async () => {
      decideMock.mockReturnValue({ ...defaultDecision, flagKey: 'exp1' });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{}} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
      optimizelyMock.setForcedDecision(
        {
          flagKey: 'exp1',
          ruleKey: 'experiment',
        },
        { variationKey: 'var2' }
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });

    it('should not recompute the decision when autoupdate is false and setting setForcedDecision', async () => {
      decideMock.mockReturnValue({ ...defaultDecision, flagKey: 'exp1' });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: false }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
      optimizelyMock.setForcedDecision(
        {
          flagKey: 'exp1',
          ruleKey: 'experiment',
        },
        { variationKey: 'var2' }
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });

    it('should recompute the decision when autoupdate is true and setting setForcedDecision', async () => {
      decideMock.mockReturnValue({ ...defaultDecision, flagKey: 'exp1' });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent options={{ autoUpdate: true }} />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
      optimizelyMock.setForcedDecision(
        {
          flagKey: 'exp1',
          ruleKey: 'experiment',
        },
        { variationKey: 'var2' }
      );

      decideMock.mockReturnValue({ ...defaultDecision, variables: { foo: 'bar' } });
      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{"foo":"bar"}|true|false'));
    });

    it('should not recompute the decision if autoupdate is true but overrideUserId is passed and setting setForcedDecision', async () => {
      decideMock.mockReturnValue({ ...defaultDecision, flagKey: 'exp1' });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent
            options={{ autoUpdate: true }}
            overrides={{
              overrideUserId: 'new_1',
            }}
          />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
      optimizelyMock.setForcedDecision(
        {
          flagKey: 'exp1',
          ruleKey: 'experiment',
        },
        { variationKey: 'var2' }
      );

      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });

    it('should not recompute the decision if autoupdate is true but overrideAttributes are passed and setting setForcedDecision', async () => {
      decideMock.mockReturnValue({ ...defaultDecision, flagKey: 'exp1' });
      render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <MyDecideComponent
            options={{ autoUpdate: true }}
            overrides={{
              overrideAttributes: {
                foo_1: 'bar_1',
              },
            }}
          />
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
      optimizelyMock.setForcedDecision(
        {
          flagKey: 'exp1',
          ruleKey: 'experiment',
        },
        { variationKey: 'var2' }
      );

      await optimizelyMock.onReady();
      await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false|{}|true|false'));
    });
  });
  describe('useTrackEvent', () => {
    it('returns track method and false states when optimizely is not provided', () => {
      const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => {
        //@ts-ignore
        return <OptimizelyProvider>{children}</OptimizelyProvider>;
      };
      const { result } = renderHook(() => useTrackEvent(), { wrapper });
      expect(result.current[0]).toBeInstanceOf(Function);
      expect(result.current[1]).toBe(false);
      expect(result.current[2]).toBe(false);
    });

    it('returns track method along with clientReady and didTimeout state when optimizely instance is provided', () => {
      const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
        <OptimizelyProvider optimizely={optimizelyMock} isServerSide={false} timeout={10000}>
          {children}
        </OptimizelyProvider>
      );

      const { result } = renderHook(() => useTrackEvent(), { wrapper });
      expect(result.current[0]).toBeInstanceOf(Function);
      expect(typeof result.current[1]).toBe('boolean');
      expect(typeof result.current[2]).toBe('boolean');
    });

    it('Log error when track method is called and optimizely instance is not provided', () => {
      const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => {
        //@ts-ignore
        return <OptimizelyProvider>{children}</OptimizelyProvider>;
      };
      const { result } = renderHook(() => useTrackEvent(), { wrapper });
      result.current[0]('eventKey');
      expect(hooksLogger.error).toHaveBeenCalledTimes(1);
    });

    it('Log error when track method is called and client is not ready', () => {
      optimizelyMock.isReady = jest.fn().mockReturnValue(false);

      const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
        <OptimizelyProvider optimizely={optimizelyMock} isServerSide={false} timeout={10000}>
          {children}
        </OptimizelyProvider>
      );

      const { result } = renderHook(() => useTrackEvent(), { wrapper });
      result.current[0]('eventKey');
      expect(hooksLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});
