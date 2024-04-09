/**
 * Copyright 2024 Optimizely
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

//jest.mock('./client');

import React from 'react';
import { render, act } from '@testing-library/react';
import { OptimizelyProvider } from './Provider';
import { DefaultUser, ReactSDKClient, createInstance } from './client';

describe('OptimizelyProvider', () => {
  let mockReactClient: ReactSDKClient;
  const config = {
    datafile: {},
  };

  beforeEach(() => {
    mockReactClient = ({
      user: {
        id: 'test-id',
        attributes: {},
      },
      setUser: jest.fn().mockResolvedValue(undefined),
    } as unknown) as ReactSDKClient;
  });

  it('should render successfully with user provided', () => {
    act(() => {
      render(<OptimizelyProvider optimizely={mockReactClient} user={{ id: 'user1' }} />);
    });

    expect(mockReactClient.setUser).toHaveBeenCalledWith({
      id: 'user1',
      attributes: {},
    });
  });

  it('should render successfully with userId provided', () => {
    act(() => {
      render(<OptimizelyProvider optimizely={mockReactClient} userId="user1" />);
    });

    expect(mockReactClient.setUser).toHaveBeenCalledWith({
      id: 'user1',
      attributes: {},
    });
  });

  it('should render successfully without user or userId provided', () => {
    act(() => {
      render(<OptimizelyProvider optimizely={mockReactClient} />);
    });

    expect(mockReactClient.setUser).toHaveBeenCalledWith(DefaultUser);
  });

  it('should render successfully with user id & attributes provided', () => {
    act(() => {
      render(
        <OptimizelyProvider optimizely={mockReactClient} user={{ id: 'user1', attributes: { attr1: 'value1' } }} />
      );
    });

    expect(mockReactClient.setUser).toHaveBeenCalledWith({
      id: 'user1',
      attributes: { attr1: 'value1' },
    });
  });

  it('should succeed just userAttributes provided', () => {
    act(() => {
      render(<OptimizelyProvider optimizely={mockReactClient} userAttributes={{ attr1: 'value1' }} />);
    });

    expect(mockReactClient.setUser).toHaveBeenCalledWith({
      id: DefaultUser.id,
      attributes: { attr1: 'value1' },
    });
  });
});
