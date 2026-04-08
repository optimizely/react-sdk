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
import { describe, it, afterEach, expect, vi } from 'vitest';
import * as utils from './helpers';

describe('getQualifiedSegments', () => {
  const odpIntegration = {
    key: 'odp',
    publicKey: 'test-api-key',
    host: 'https://odp.example.com',
  };

  const makeDatafile = (overrides: Record<string, any> = {}) => ({
    integrations: [odpIntegration],
    typedAudiences: [
      {
        conditions: ['or', { match: 'qualified', value: 'seg1' }, { match: 'qualified', value: 'seg2' }],
      },
    ],
    ...overrides,
  });

  const mockFetchResponse = (body: any, ok = true) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok,
        json: () => Promise.resolve(body),
      })
    );
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns error when datafile is invalid or missing ODP integration', async () => {
    // undefined datafile
    // @ts-ignore
    let result = await utils.getQualifiedSegments('user-1');
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('Invalid datafile: expected a JSON string or object');

    // invalid JSON string
    result = await utils.getQualifiedSegments('user-1', '{bad json');
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('Invalid datafile: failed to parse JSON string');

    // no ODP integration
    result = await utils.getQualifiedSegments('user-1', { integrations: [] });
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('ODP integration not found or missing publicKey/host');

    // ODP integration missing publicKey
    result = await utils.getQualifiedSegments('user-1', {
      integrations: [{ key: 'odp', host: 'https://odp.example.com' }],
    });
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('ODP integration not found or missing publicKey/host');
  });

  it('returns empty array with no error when ODP is integrated but no segment conditions exist', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const datafile = makeDatafile({ typedAudiences: [], audiences: [] });
    const result = await utils.getQualifiedSegments('user-1', datafile);

    expect(result.segments).toEqual([]);
    expect(result.error).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls ODP GraphQL API and returns only qualified segments', async () => {
    mockFetchResponse({
      data: {
        customer: {
          audiences: {
            edges: [{ node: { name: 'seg1', state: 'qualified' } }, { node: { name: 'seg2', state: 'not_qualified' } }],
          },
        },
      },
    });

    const result = await utils.getQualifiedSegments('user-1', makeDatafile());

    expect(result.segments).toEqual(['seg1']);
    expect(result.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('https://odp.example.com/v3/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key',
      },
      body: expect.stringContaining('user-1'),
    });
  });

  it('returns error when fetch fails or response is not ok', async () => {
    // network error
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    let result = await utils.getQualifiedSegments('user-1', makeDatafile());
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('network error');

    // non-200 response
    mockFetchResponse({}, false);
    result = await utils.getQualifiedSegments('user-1', makeDatafile());
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toContain('ODP request failed with status');
  });

  it('skips audiences with malformed conditions string without throwing', async () => {
    mockFetchResponse({
      data: {
        customer: {
          audiences: {
            edges: [{ node: { name: 'seg1', state: 'qualified' } }],
          },
        },
      },
    });

    const datafile = makeDatafile({
      typedAudiences: [{ conditions: '{bad json' }, { conditions: ['or', { match: 'qualified', value: 'seg1' }] }],
    });

    const result = await utils.getQualifiedSegments('user-1', datafile);
    expect(result.segments).toEqual(['seg1']);
    expect(result.error).toBeNull();
  });

  it('returns error when response contains GraphQL errors or missing edges', async () => {
    // GraphQL errors
    mockFetchResponse({ errors: [{ message: 'something went wrong' }] });
    let result = await utils.getQualifiedSegments('user-1', makeDatafile());
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('ODP GraphQL error: something went wrong');

    // missing edges path
    mockFetchResponse({ data: {} });
    result = await utils.getQualifiedSegments('user-1', makeDatafile());
    expect(result.segments).toEqual([]);
    expect(result.error?.message).toBe('ODP response missing audience edges');
  });
});
