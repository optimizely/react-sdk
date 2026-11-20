/**
 * Copyright 2026, Optimizely
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

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { createInstance as jsCreateInstance } from '@optimizely/optimizely-sdk';
import type { Config, Client } from '@optimizely/optimizely-sdk';
import { createInstance, getReactClientMeta, CLIENT_ENGINE, CLIENT_VERSION } from './createInstance';

// Fresh object per call so clients (and their WeakMap entries) don't leak between tests
const createMockJsClient = () =>
  ({
    onReady: vi.fn().mockResolvedValue(undefined),
    createUserContext: vi.fn(),
    close: vi.fn(),
  }) as unknown as Client;

vi.mock('@optimizely/optimizely-sdk', () => ({
  createInstance: vi.fn(),
}));

const mockedJsCreateInstance = jsCreateInstance as MockedFunction<typeof jsCreateInstance>;

// Minimal valid config for testing
const createTestConfig = (overrides: Partial<Config> = {}): Config => ({
  projectConfigManager: {} as Config['projectConfigManager'],
  ...overrides,
});

describe('createInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedJsCreateInstance.mockImplementation(createMockJsClient);
  });

  describe('client engine and version', () => {
    it('should set clientEngine and clientVersion to "react-sdk"', () => {
      createInstance(createTestConfig());
      expect(mockedJsCreateInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          clientEngine: CLIENT_ENGINE,
          clientVersion: CLIENT_VERSION,
        })
      );
    });
  });

  describe('returned client', () => {
    it('should keep state mutated via `this` on the underlying JS SDK client', () => {
      const jsClient = {
        state: 'initial',
        setState(value: string) {
          this.state = value;
        },
      };
      mockedJsCreateInstance.mockReturnValueOnce(jsClient as unknown as Client);

      const client = createInstance(createTestConfig()) as unknown as typeof jsClient;
      client.setState('updated');

      expect(jsClient.state).toBe('updated');
    });
  });

  describe('react client meta', () => {
    it('should set hasOdpManager to false when odpManager is not provided', () => {
      const client = createInstance(createTestConfig());
      expect(getReactClientMeta(client).hasOdpManager).toBe(false);
    });

    it('should set hasOdpManager to true when odpManager is provided', () => {
      const client = createInstance(createTestConfig({ odpManager: {} as Config['odpManager'] }));
      expect(getReactClientMeta(client).hasOdpManager).toBe(true);
    });

    it('should set hasVuidManager to false when vuidManager is not provided', () => {
      const client = createInstance(createTestConfig());
      expect(getReactClientMeta(client).hasVuidManager).toBe(false);
    });

    it('should set hasVuidManager to true when vuidManager is provided', () => {
      const client = createInstance(createTestConfig({ vuidManager: {} as Config['vuidManager'] }));
      expect(getReactClientMeta(client).hasVuidManager).toBe(true);
    });

    it('should keep meta separate per client', () => {
      const withOdp = createInstance(createTestConfig({ odpManager: {} as Config['odpManager'] }));
      const withoutOdp = createInstance(createTestConfig());
      expect(getReactClientMeta(withOdp).hasOdpManager).toBe(true);
      expect(getReactClientMeta(withoutOdp).hasOdpManager).toBe(false);
    });

    it('should return undefined for a client not created via createInstance', () => {
      expect(getReactClientMeta(createMockJsClient())).toBeUndefined();
    });
  });
});
