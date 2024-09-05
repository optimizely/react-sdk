/**
 * Copyright 2018-2019, 2023-2024, Optimizely
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
import '@testing-library/jest-dom';

import { OptimizelyExperiment } from './Experiment';
import { OptimizelyProvider } from './Provider';
import { ReactSDKClient } from './client';
import { OptimizelyVariation } from './Variation';

type Resolver = {
  resolve: (value: { success: boolean; reason?: string }) => void;
  reject: (reason?: string) => void;
};

describe('<OptimizelyExperiment>', () => {
  const variationKey = 'matchingVariation';
  let resolver: Resolver;
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

    optimizelyMock = {
      onReady: jest.fn().mockImplementation(() => onReadyPromise),
      activate: jest.fn().mockImplementation(() => variationKey),
      onUserUpdate: jest.fn().mockImplementation(() => () => {}),
      getVuid: jest.fn().mockImplementation(() => 'vuid_95bf72cebc774dfd8e8e580a5a1'),
      notificationCenter: {
        addNotificationListener: jest.fn().mockImplementation(() => {}),
        removeNotificationListener: jest.fn().mockImplementation(() => {}),
      },
      user: {
        id: 'testuser',
        attributes: {},
      },
      isReady: jest.fn().mockImplementation(() => isReady),
      getIsReadyPromiseFulfilled: () => true,
      getIsUsingSdkKey: () => true,
      onForcedVariationsUpdate: jest.fn().mockReturnValue(() => {}),
      setUser: jest.fn(),
    } as unknown as ReactSDKClient;
  });

  it('does not throw an error when not rendered in the context of an OptimizelyProvider', () => {
    const { container } = render(
      <OptimizelyExperiment experiment="experiment1">
        {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
      </OptimizelyExperiment>
    );

    expect(container).toBeDefined();
  });

  it('isValidElement check works as expected', async () => {
    const { container } = render(
      <OptimizelyProvider optimizely={optimizelyMock}>
        <OptimizelyExperiment experiment="experiment1">
          {(variation: string | null) => (
            <>
              <span data-testid="variation-key">{variation}</span>
              {null}
              {<div />}
            </>
          )}
        </OptimizelyExperiment>
      </OptimizelyProvider>
    );
    resolver.resolve({ success: true });

    await waitFor(() => {
      const validChildren = container.getElementsByTagName('span');
      expect(validChildren).toHaveLength(1);
    });
  });

  describe('when isServerSide prop is false', () => {
    it('should wait client is ready then render result of activate', async () => {
      const { container, rerender } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready: onReady resolving, firing config update notification
      resolver.resolve({ success: true });

      rerender(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('matchingVariation'));

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
    });

    it('should allow timeout to be overridden', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" timeout={200}>
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      //   Simulate client becoming ready; oReady resolving, firing config update notification
      resolver.resolve({ success: true });

      await waitFor(() => expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined));
    });

    it(`should use the Experiment prop's timeout when there is no timeout passed to <Provider>`, async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1" timeout={200}>
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 200 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      //   Simulate client becoming ready
      resolver.resolve({ success: true });

      await waitFor(() => expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined));
    });

    it('should render using <OptimizelyVariation> when the variationKey matches', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation variation="otherVariation">
              <span data-testid="variation-key">other variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="matchingVariation">
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

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('default variation'));
    });

    it('should NOT render using <OptimizelyVariation default> in first position when matching variation', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation default>
              <span data-testid="variation-key">default variation</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="matchingVariation">
              <span data-testid="variation-key">matching variation</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

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

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('default variation'));
    });

    describe('OptimizelyVariation with default & variation props', () => {
      it('should render default with NO matching variations ', async () => {
        const { container } = render(
          <OptimizelyProvider optimizely={optimizelyMock}>
            <OptimizelyExperiment experiment="experiment1">
              <OptimizelyVariation default variation="nonMatchingVariation">
                <span data-testid="variation-key">default & non matching variation</span>
              </OptimizelyVariation>
              <OptimizelyVariation variation="anotherNonMatchingVariation">
                <span data-testid="variation-key">another non-matching variation</span>
              </OptimizelyVariation>
            </OptimizelyExperiment>
          </OptimizelyProvider>
        );

        // while it's waiting for onReady()
        expect(container.innerHTML).toBe('');

        // Simulate client becoming ready
        resolver.resolve({ success: true });

        await waitFor(() =>
          expect(screen.getByTestId('variation-key')).toHaveTextContent('default & non matching variation')
        );
      });

      it('should render matching variation with a default & non-matching ', async () => {
        const { container } = render(
          <OptimizelyProvider optimizely={optimizelyMock}>
            <OptimizelyExperiment experiment="experiment1">
              <OptimizelyVariation default variation="nonMatchingVariation">
                <span data-testid="variation-key">default & non matching variation</span>
              </OptimizelyVariation>
              <OptimizelyVariation variation="matchingVariation">
                <span data-testid="variation-key">matching variation</span>
              </OptimizelyVariation>
            </OptimizelyExperiment>
          </OptimizelyProvider>
        );

        // while it's waiting for onReady()
        expect(container.innerHTML).toBe('');

        // Simulate client becoming ready
        resolver.resolve({ success: true });

        await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('matching variation'));
      });
    });

    it('should render the last default variation when multiple default props present', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock}>
          <OptimizelyExperiment experiment="experiment1">
            <OptimizelyVariation default variation="nonMatchingVariation1">
              <span data-testid="variation-key">non-matching variation 1</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="nonMatchingVariation2">
              <span data-testid="variation-key">non-matching variation 2</span>
            </OptimizelyVariation>
            <OptimizelyVariation default variation="nonMatchingVariation3">
              <span data-testid="variation-key">non-matching variation 3</span>
            </OptimizelyVariation>
            <OptimizelyVariation variation="nonMatchingVariation4">
              <span data-testid="variation-key">non-matching variation 4</span>
            </OptimizelyVariation>
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('non-matching variation 3'));
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
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await waitFor(() => {
        expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', 'james123', { betaUser: true });
        expect(screen.getByTestId('variation-key')).toHaveTextContent('matchingVariation');
      });
    });

    it('should pass the values for clientReady and didTimeout', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string | null, clientReady?: boolean, didTimeout?: boolean) => (
              <span data-testid="variation-key">{`${variation}|${clientReady}|${didTimeout}`}</span>
            )}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });

      await waitFor(() => {
        expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
        expect(screen.getByTestId('variation-key')).toHaveTextContent('matchingVariation|true|false');
      });
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

        await waitFor(() => expect(container.innerHTML).toBe(''));
      });
    });
  });

  describe('when autoUpdate prop is true', () => {
    it('should re-render when the OPTIMIZELY_CONFIG_UDPATE notification fires', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" autoUpdate={true}>
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );
      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');

      // Simulate client becoming ready
      resolver.resolve({ success: true });
      isReady = true;

      await waitFor(() => {
        expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
        expect(screen.getByTestId('variation-key')).toHaveTextContent('matchingVariation');
      });

      // capture the OPTIMIZELY_CONFIG_UPDATE function
      // change the return value of activate
      const mockActivate = optimizelyMock.activate as jest.Mock;
      mockActivate.mockImplementationOnce(() => 'newVariation');

      const updateFn = (optimizelyMock.notificationCenter.addNotificationListener as jest.Mock).mock.calls[0][1];
      updateFn();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('newVariation'));
      expect(optimizelyMock.activate).toHaveBeenCalledTimes(2);
    });

    it('should re-render when the user changes', async () => {
      const { container } = render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100}>
          <OptimizelyExperiment experiment="experiment1" autoUpdate={true}>
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
          </OptimizelyExperiment>
        </OptimizelyProvider>
      );
      expect(optimizelyMock.onReady).toHaveBeenCalledWith({ timeout: 100 });

      // while it's waiting for onReady()
      expect(container.innerHTML).toBe('');
      // Simulate client becoming ready
      resolver.resolve({ success: true });
      isReady = true;

      await waitFor(() => {
        expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
        expect(screen.getByTestId('variation-key')).toHaveTextContent('matchingVariation');
      });

      // capture the onUserUpdate function
      const updateFn = (optimizelyMock.onUserUpdate as jest.Mock).mock.calls[0][0];
      const mockActivate = optimizelyMock.activate as jest.Mock;
      mockActivate.mockImplementationOnce(() => 'newVariation');
      updateFn();

      expect(optimizelyMock.activate).toHaveBeenCalledWith('experiment1', undefined, undefined);
      await waitFor(() => expect(screen.getByTestId('variation-key')).toHaveTextContent('newVariation'));
      expect(optimizelyMock.activate).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the isServerSide prop is true', () => {
    it('should immediately render the result of the experiment without waiting', async () => {
      render(
        <OptimizelyProvider optimizely={optimizelyMock} timeout={100} isServerSide={true}>
          <OptimizelyExperiment experiment="experiment1">
            {(variation: string | null) => <span data-testid="variation-key">{variation}</span>}
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
            <OptimizelyVariation variation="matchingVariation">
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
