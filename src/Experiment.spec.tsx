/**
 * Copyright 2018-2019, 2023, Optimizely
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
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { OptimizelyExperiment } from './Experiment';
import { OptimizelyProvider } from './Provider';
import { ReactSDKClient } from './client';
import { OptimizelyVariation } from './Variation';

describe('<OptimizelyExperiment>', () => {
  const variationKey = 'variationResult';
  let resolver: unknown;
  let optimizelyMock: ReactSDKClient;
  let isReady: boolean;

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
      isReady: jest.fn().mockImplementation(() => isReady),
      getIsReadyPromiseFulfilled: () => true,
      getIsUsingSdkKey: () => true,
      onForcedVariationsUpdate: jest.fn().mockReturnValue(() => {}),
    } as unknown) as ReactSDKClient;
  });

  it('does not throw an error when not rendered in the context of an OptimizelyProvider', () => {
    expect(() => {
      render(
        <OptimizelyExperiment experiment="experiment1">
          {(variation: string) => <span data-testid="variation-key">{variation}</span>}
        </OptimizelyExperiment>
      );
    }).toBeDefined();
  });

  describe('when isServerSide prop is false', () => {
    it('should wait client is ready then render result of activate', async () => {
      const { container, rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready: onReady resolving, firing config update notification
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('variationResult'));

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
    });

    it('should allow timeout to be overridden', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" timeout={200}>
            {(variation: string) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      //   Simulate client becoming ready; onReady resolving, firing config update notification
      resolver.resolve({ success: true });
      await optimizelyMock.onReady();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
    });

    it(`should use the Experiment prop's timeout when there is no timeout passed to <Provider>`, async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1" timeout={200}>
            {(variation: string) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      //   Simulate client becoming ready
      resolver.resolve({ success: true });
      await optimizelyMock.onReady();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
    });

    it('should render using <OptimizelyVariation> when the variationKey matches', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              <span data-testid="variation-key">other variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="variationResult">
              <span data-testid="variation-key">correct variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation default>
              <span data-testid="variation-key">default variation</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );
      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('correct variation'));
    });

    it('should render using <OptimizelyVariation default> in last position', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              <span data-testid="variation-key">other variation</span>
            </OptimizelyVariation>

            <OptimizelyVariation default>
              <span data-testid="variation-key">default variation</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('default variation'));
    });

    it('should NOT render using <OptimizelyVariation default> in first position when matching variation', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation default>
              <span data-testid="variation-key">default variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="variationResult">
              <span data-testid="variation-key">matching variation</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('matching variation'));
    });

    it('should render using <OptimizelyVariation default> in first position when NO matching variation', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation default>
              <span data-testid="variation-key">default variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="otherVariation">
              <span data-testid="variation-key">other non-matching variation</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('default variation'));
    });

    it('should render an empty string when no default or matching variation is provided', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              <span data-testid="variation-key">other variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="otherVariation2">
              <span data-testid="variation-key">other variation2</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      expect(container.innerHTML).toBe('');
    });

    it('should pass the override props through', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment
            experiment="experiment1"
            overrideUserId="james123"
            overrideAttributes={{ betaUser: true }}
          >
            {(variation: string) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', 'james123', { betaUser: true });

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('variationResult'));
    });

    it('should pass the values for clientReady and didTimeout', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string, clientReady: boolean, didTimeout: boolean) => (
              <span data-testid="variation-key">{`${variation}|${clientReady}|${didTimeout}`}</span>
            )}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await optimizelyMock.onReady();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('variationResult|true|false'));
    });

    describe('when the onReady() promise return { success: false }', () => {
      it('should still render', async () => {
        const { container } = render(
          <OptimizelyProvider optimizely={optimizelyMock}>
            <OptimizelyExperiment experiment="experiment1">
              <OptimizelyVariation variation="otherVariation">
                <span data-testid="variation-key">other variation</span>
              </OptimizelyVariation>
              <OptimizelyVariation variation="otherVariation2">
                <span data-testid="variation-key">other variation2</span>
              </OptimizelyVariation>
            </OptimizelyExperiment>
          </OptimizelyProvider>
        );

        // while it's waiting for onReady()
        expect(container.innerHTML).toBe('');

        resolver.resolve({ success: false, reason: 'fail' });
        await optimizelyMock.onReady();

        expect(container.innerHTML).toBe('');
      });
    });
  });

  describe('when autoUpdate prop is true', () => {
    it('should re-render when the OPTIMIZELY_CONFIG_UDPATE notification fires', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" autoUpdate={true}>
            {(variation: string, clientReady: boolean, didTimeout: boolean) => (
              <span data-testid="variation-key">{variation}</span>
            )}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );
      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });
      isReady = true;
      await act(async () => await optimizelyMock.onReady());

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('variationResult'));

      // capture the OPTIMIZELY_CONFIG_UPDATE function
      // change the return value of activate
      const mockActivate = optimizelyMock.activate as jest.Mock;
      mockActivate.mockImplementationOnce(() => 'newVariation');

      const updateFn = (optimizelyMock.notificationCenter.addNotificationListener as jest.Mock).mock.calls[0][1];
      updateFn();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('newVariation'));
      expect(optimizelyMock.activate).toBeCalledTimes(2);
    });

    it('should re-render when the user changes', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" autoUpdate={true}>
            {(variation: string, clientReady: boolean, didTimeout: boolean) => (
              <span data-testid="variation-key">{variation}</span>
            )}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );
      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');
      // Simulate client becoming ready
      resolver.resolve({ success: true });
      isReady = true;
      await act(async () => await optimizelyMock.onReady());
      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('variationResult'));

      // capture the onUserUpdate function
      const updateFn = (optimizelyMock.onUserUpdate as jest.Mock).mock.calls[0][0];
      const mockActivate = optimizelyMock.activate as jest.Mock;
      mockActivate.mockImplementationOnce(() => 'newVariation');
      updateFn();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('newVariation'));
      expect(optimizelyMock.activate).toBeCalledTimes(2);
    });
  });

  describe('when the isServerSide prop is true', () => {
    it('should immediately render the result of the experiment without waiting', async () => {
      render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100} isServerSide={true}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string, clientReady: boolean, didTimeout: boolean) => (
              <span data-testid="variation-key">{variation}</span>
            )}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent(variationKey));
    });

    it('should render using <OptimizelyVariation> when the variationKey matches', async () => {
      render(
        <OptimizelyProvider optimizely={optimizelyMock} isServerSide={true}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              <span data-testid="variation-key">other variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="variationResult">
              <span data-testid="variation-key">correct variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation default>
              <span data-testid="variation-key">default variation</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );
      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('correct variation'));
    });
  });
});
