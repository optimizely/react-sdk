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

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { OptimizelyProvider } from './Provider';
import { DefaultUser, ReactSDKClient } from './client';
import { getLogger } from '@optimizely/optimizely-sdk';

jest.mock('@optimizely/optimizely-sdk', () => {
  const originalModule = jest.requireActual('@optimizely/optimizely-sdk');
  return {
    ...originalModule,
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  };
});

const logger = getLogger('<OptimizelyProvider>');

describe('OptimizelyProvider', () => {
  let mockReactClient: ReactSDKClient;
  const user1 = {
    id: 'user1',
    attributes: { attr1: 'value1' },
  };
  beforeEach(() => {
    mockReactClient = {
      user: user1,
      setUser: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReactSDKClient;
  });

  it('should log error if optimizely is not provided', async () => {
    // @ts-ignore
    render(<OptimizelyProvider optimizely={null} />);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should resolve user promise and set user in optimizely', async () => {
    render(<OptimizelyProvider optimizely={mockReactClient} user={Promise.resolve(user1)} />);
    await waitFor(() => expect(mockReactClient.setUser).toHaveBeenCalledWith(user1));
  });

  it('should render successfully with user provided', () => {
    render(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith(user1);
  });

  it('should throw error, if setUser throws error', () => {
    mockReactClient.setUser = jest.fn().mockRejectedValue(new Error('error'));
    render(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should render successfully with userId provided', () => {
    render(<OptimizelyProvider optimizely={mockReactClient} userId={user1.id} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith({
      id: user1.id,
      attributes: {},
    });
  });

  it('should render successfully without user or userId provided', () => {
    render(<OptimizelyProvider optimizely={mockReactClient} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith(DefaultUser);
  });

  it('should render successfully with user id & attributes provided', () => {
    render(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith(user1);
  });

  it('should succeed just userAttributes provided', () => {
    render(<OptimizelyProvider optimizely={mockReactClient} userAttributes={{ attr1: 'value1' }} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith({
      id: DefaultUser.id,
      attributes: { attr1: 'value1' },
    });
  });

  it('should not update when isServerSide is true', () => {
    // Initial render
    const { rerender } = render(<OptimizelyProvider optimizely={mockReactClient} isServerSide={true} user={user1} />);

    // Reset mock to clear the initial constructor call
    (mockReactClient.setUser as jest.Mock).mockClear();

    // Re-render with same `isServerSide` value
    rerender(<OptimizelyProvider optimizely={mockReactClient} isServerSide={true} user={user1} />);

    expect(mockReactClient.setUser).not.toHaveBeenCalled();
  });

  it('should set user if optimizely.user.id is not set', () => {
    mockReactClient.user = { id: '', attributes: {} };
    const { rerender } = render(<OptimizelyProvider optimizely={mockReactClient} />);

    // Change props to trigger componentDidUpdate
    rerender(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith(user1);
  });

  it('should update user if users are not equal', () => {
    const user2 = { id: 'user-2', attributes: {} };

    const { rerender } = render(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);

    // Change props to a different user to trigger componentDidUpdate
    rerender(<OptimizelyProvider optimizely={mockReactClient} user={user2} />);

    expect(mockReactClient.setUser).toHaveBeenCalledWith(user2);
  });

  it('should not update user if users are equal', () => {
    const { rerender } = render(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);
    // Reset mock to clear the initial constructor call
    (mockReactClient.setUser as jest.Mock).mockClear();
    // Change props with the same user to trigger componentDidUpdate
    rerender(<OptimizelyProvider optimizely={mockReactClient} user={user1} />);

    expect(mockReactClient.setUser).not.toHaveBeenCalled();
  });
});
