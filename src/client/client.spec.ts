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
import type { Config } from '@optimizely/optimizely-sdk';
import { createInstance, CLIENT_ENGINE, CLIENT_VERSION, REACT_CLIENT_META } from './createInstance';
import type { ReactClientMeta } from './createInstance';

type ClientWithMeta = Record<symbol, ReactClientMeta>;

const mockJsClient = vi.hoisted(() => ({
  onReady: vi.fn().mockResolvedValue(undefined),
  createUserContext: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@optimizely/optimizely-sdk', () => ({
  createInstance: vi.fn().mockReturnValue(mockJsClient),
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

  describe('prototype delegation', () => {
    it('should return an object that delegates to the JS SDK client', () => {
      const client = createInstance(createTestConfig());
      // Methods from the JS client should be accessible via prototype chain
      expect(client.onReady).toBe(mockJsClient.onReady);
      expect(client.createUserContext).toBe(mockJsClient.createUserContext);
      expect(client.close).toBe(mockJsClient.close);
    });

    it('should have the JS SDK client as its prototype', () => {
      const client = createInstance(createTestConfig());
      expect(Object.getPrototypeOf(client)).toBe(mockJsClient);
    });
  });

  describe('REACT_CLIENT_META', () => {
    it('should set hasOdpManager to false when odpManager is not provided', () => {
      const client = createInstance(createTestConfig());
      const meta = (client as unknown as ClientWithMeta)[REACT_CLIENT_META];
      expect(meta.hasOdpManager).toBe(false);
    });

    it('should set hasOdpManager to true when odpManager is provided', () => {
      const client = createInstance(createTestConfig({ odpManager: {} as Config['odpManager'] }));
      const meta = (client as unknown as ClientWithMeta)[REACT_CLIENT_META];
      expect(meta.hasOdpManager).toBe(true);
    });

    it('should set isVuidEnabled to false when vuidManager is not provided', () => {
      const client = createInstance(createTestConfig());
      const meta = (client as unknown as ClientWithMeta)[REACT_CLIENT_META];
      expect(meta.isVuidEnabled).toBe(false);
    });

    it('should set isVuidEnabled to true when vuidManager is provided', () => {
      const client = createInstance(createTestConfig({ vuidManager: {} as Config['vuidManager'] }));
      const meta = (client as unknown as ClientWithMeta)[REACT_CLIENT_META];
      expect(meta.isVuidEnabled).toBe(true);
    });

    it('should store meta on the react client, not on the prototype', () => {
      const client = createInstance(createTestConfig());
      expect(Object.prototype.hasOwnProperty.call(client, REACT_CLIENT_META)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(mockJsClient, REACT_CLIENT_META)).toBe(false);
    });
  });
});
