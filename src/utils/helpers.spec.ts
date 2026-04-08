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

  it('returns null when datafile is invalid or missing ODP integration', async () => {
    // undefined datafile
    // @ts-ignore
    expect(await utils.getQualifiedSegments('user-1')).toBeNull();
    // invalid JSON string
    expect(await utils.getQualifiedSegments('user-1', '{bad json')).toBeNull();
    // no ODP integration
    expect(await utils.getQualifiedSegments('user-1', { integrations: [] })).toBeNull();
    // ODP integration missing publicKey
    expect(
      await utils.getQualifiedSegments('user-1', {
        integrations: [{ key: 'odp', host: 'https://odp.example.com' }],
      })
    ).toBeNull();
  });

  it('returns empty array when ODP is integrated but no segment conditions exist', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const datafile = makeDatafile({ typedAudiences: [], audiences: [] });
    const result = await utils.getQualifiedSegments('user-1', datafile);

    expect(result).toEqual([]);
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

    expect(result).toEqual(['seg1']);
    expect(global.fetch).toHaveBeenCalledWith('https://odp.example.com/v3/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key',
      },
      body: expect.stringContaining('user-1'),
    });
  });

  it('returns null when fetch fails or response is not ok', async () => {
    // network error
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    expect(await utils.getQualifiedSegments('user-1', makeDatafile())).toBeNull();

    // non-200 response
    mockFetchResponse({}, false);

    expect(await utils.getQualifiedSegments('user-1', makeDatafile())).toBeNull();
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
    expect(result).toEqual(['seg1']);
  });

  it('returns null when response contains GraphQL errors or missing edges', async () => {
    // GraphQL errors
    mockFetchResponse({ errors: [{ message: 'something went wrong' }] });

    expect(await utils.getQualifiedSegments('user-1', makeDatafile())).toBeNull();

    // missing edges path
    mockFetchResponse({ data: {} });

    expect(await utils.getQualifiedSegments('user-1', makeDatafile())).toBeNull();
  });
});
