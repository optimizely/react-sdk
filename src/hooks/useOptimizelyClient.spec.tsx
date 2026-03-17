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

import { vi, describe, it, expect } from 'vitest';
import React, { useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useOptimizelyClient } from './useOptimizelyClient';
import { OptimizelyProvider, ProviderStateStore, OptimizelyContext } from '../provider/index';
import { createInstance, createStaticProjectConfigManager } from '../client/index';
import type { OptimizelyContextValue } from '../provider/index';

function createClient() {
  return createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile: JSON.stringify({}) }),
  });
}

function useRenderCount() {
  const renderCount = useRef(0);
  return ++renderCount.current;
}

describe('useOptimizelyClient', () => {
  it('should throw when used outside of OptimizelyProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useOptimizelyClient());
    }).toThrow('Optimizely hooks must be used within an <OptimizelyProvider>');

    consoleSpy.mockRestore();
  });

  it('should return the same client instance passed to OptimizelyProvider', () => {
    const client = createClient();

    const { result } = renderHook(() => useOptimizelyClient(), {
      wrapper: ({ children }) => <OptimizelyProvider client={client}>{children}</OptimizelyProvider>,
    });

    expect(result.current).toBe(client);
  });

  it('should not re-render when store state changes', () => {
    const client = createClient();
    const store = new ProviderStateStore();

    const contextValue: OptimizelyContextValue = { store, client };

    let capturedRenderCount = 0;

    function TestComponent() {
      const hookClient = useOptimizelyClient();
      const renderCount = useRenderCount();
      capturedRenderCount = renderCount;
      return <div data-testid="client">{hookClient ? 'has-client' : 'no-client'}</div>;
    }

    render(
      <OptimizelyContext.Provider value={contextValue}>
        <TestComponent />
      </OptimizelyContext.Provider>
    );

    expect(screen.getByTestId('client').textContent).toBe('has-client');
    const initialRenderCount = capturedRenderCount;

    // Trigger store state changes that should NOT cause useOptimizelyClient to re-render
    act(() => {
      store.setError(new Error('test'));
    });
    expect(capturedRenderCount).toBe(initialRenderCount);

    act(() => {
      store.refresh();
    });
    expect(capturedRenderCount).toBe(initialRenderCount);
  });
});
