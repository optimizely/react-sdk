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
import { createInstance, CLIENT_ENGINE, CLIENT_VERSION } from './createInstance';

vi.mock('@optimizely/optimizely-sdk', () => ({
  createInstance: vi.fn().mockReturnValue({
    onReady: vi.fn().mockResolvedValue(undefined),
    createUserContext: vi.fn(),
    close: vi.fn(),
  }),
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
});
