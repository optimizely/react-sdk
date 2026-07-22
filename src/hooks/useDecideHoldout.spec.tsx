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

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ProviderStateStore } from '../provider';
import { useDecide } from './useDecide';
import { useDecideForKeys } from './useDecideForKeys';
import { useDecideAll } from './useDecideAll';
import { createMockUserContext, createMockClient, createWrapper, createProviderWrapper } from './testUtils';
import type { OptimizelyDecision, Client, OptimizelyUserContext } from '@optimizely/optimizely-sdk';

function createHoldoutDecision(overrides: Partial<OptimizelyDecision> = {}): OptimizelyDecision {
  return {
    variationKey: 'holdout_variation',
    enabled: false,
    variables: {},
    ruleKey: 'holdout_rule',
    flagKey: 'flag_with_holdout',
    userContext: {} as OptimizelyUserContext,
    reasons: ['User is in holdout group "global_holdout".'],
    ...overrides,
  };
}

describe('useDecide – holdout exclusion behavior', () => {
  let store: ProviderStateStore;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ProviderStateStore();
    mockClient = createMockClient(true);
  });

  it('should surface TD decision when exclude_targeted_deliveries=true and TD rule applies', () => {
    const tdDecision = createHoldoutDecision({
      variationKey: 'td_variation',
      enabled: true,
      ruleKey: 'targeted_delivery_rule',
      reasons: [
        'User meets audience conditions for holdout "global_holdout".',
        "Holdout 'global_holdout' has excludeTargetedDeliveries enabled, continuing to rollout evaluation.",
        'User meets audience conditions for targeted delivery.',
      ],
    });

    const mockUserContext = createMockUserContext({
      decide: vi.fn().mockReturnValue(tdDecision),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_with_holdout'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision?.variationKey).toBe('td_variation');
    expect(result.current.decision?.enabled).toBe(true);
    expect(result.current.decision?.ruleKey).toBe('targeted_delivery_rule');
    expect(result.current.decision?.reasons).toContain(
      "Holdout 'global_holdout' has excludeTargetedDeliveries enabled, continuing to rollout evaluation."
    );
    expect(result.current.decision?.reasons).toContain('User meets audience conditions for targeted delivery.');
  });

  it('should include bypass reason between audience evaluation and rollout evaluation', () => {
    const bypassDecision = createHoldoutDecision({
      variationKey: 'rollout_variation',
      enabled: true,
      ruleKey: 'rollout_rule',
      reasons: [
        'User meets audience conditions for holdout "test_holdout".',
        "Holdout 'test_holdout' has excludeTargetedDeliveries enabled, continuing to rollout evaluation.",
        'User bucketed into rollout rule.',
      ],
    });

    const mockUserContext = createMockUserContext({
      decide: vi.fn().mockReturnValue(bypassDecision),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_with_holdout'), { wrapper });

    const reasons = result.current.decision?.reasons ?? [];
    const audienceIdx = reasons.findIndex((r: string) => r.includes('meets audience conditions for holdout'));
    const bypassIdx = reasons.findIndex((r: string) => r.includes('excludeTargetedDeliveries enabled'));
    const rolloutIdx = reasons.findIndex((r: string) => r.includes('bucketed into rollout'));

    expect(audienceIdx).toBeGreaterThanOrEqual(0);
    expect(bypassIdx).toBeGreaterThan(audienceIdx);
    expect(rolloutIdx).toBeGreaterThan(bypassIdx);
  });

  it('should surface holdout decision with impression event dispatched', () => {
    const holdoutDecision = createHoldoutDecision({
      variationKey: 'holdout_variation',
      enabled: false,
      reasons: ['User is in holdout group "global_holdout".', 'Holdout impression event dispatched.'],
    });

    const mockUserContext = createMockUserContext({
      decide: vi.fn().mockReturnValue(holdoutDecision),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_with_holdout'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision?.enabled).toBe(false);
    expect(result.current.decision?.reasons).toContain('Holdout impression event dispatched.');
  });

  it('should surface holdout decision when exclude_targeted_deliveries=false', () => {
    const holdoutDecision = createHoldoutDecision({
      reasons: ['User is in holdout group "global_holdout".', 'Holdout applies to targeted delivery rules.'],
    });

    const mockUserContext = createMockUserContext({
      decide: vi.fn().mockReturnValue(holdoutDecision),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_with_holdout'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision?.variationKey).toBe('holdout_variation');
    expect(result.current.decision?.enabled).toBe(false);
    expect(result.current.decision?.reasons).toContain('User is in holdout group "global_holdout".');
  });

  it('should surface holdout decision when holdout applies to A/B test rule', () => {
    const holdoutDecision = createHoldoutDecision({
      reasons: ['User is in holdout group "global_holdout".', 'Holdout applies to experiment rule "ab_test_rule".'],
    });

    const mockUserContext = createMockUserContext({
      decide: vi.fn().mockReturnValue(holdoutDecision),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecide('flag_with_holdout'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decision?.variationKey).toBe('holdout_variation');
    expect(result.current.decision?.enabled).toBe(false);
    expect(result.current.decision?.reasons).toContain('Holdout applies to experiment rule "ab_test_rule".');
  });
});

describe('useDecideForKeys – holdout exclusion behavior', () => {
  let store: ProviderStateStore;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ProviderStateStore();
    mockClient = createMockClient(true);
  });

  it('should surface holdout decisions for multiple flags with different holdout outcomes', () => {
    const decisions: Record<string, OptimizelyDecision> = {
      flag_holdout_applied: createHoldoutDecision({
        flagKey: 'flag_holdout_applied',
        variationKey: 'holdout_variation',
        enabled: false,
        reasons: ['User is in holdout group "global_holdout".'],
      }),
      flag_holdout_excluded: createHoldoutDecision({
        flagKey: 'flag_holdout_excluded',
        variationKey: 'td_variation',
        enabled: true,
        ruleKey: 'targeted_delivery_rule',
        reasons: ['User excluded from holdout "global_holdout" for targeted delivery rule.'],
      }),
    };

    const mockUserContext = createMockUserContext({
      decideForKeys: vi.fn().mockReturnValue(decisions),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideForKeys(['flag_holdout_applied', 'flag_holdout_excluded']), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decisions['flag_holdout_applied'].enabled).toBe(false);
    expect(result.current.decisions['flag_holdout_applied'].variationKey).toBe('holdout_variation');
    expect(result.current.decisions['flag_holdout_excluded'].enabled).toBe(true);
    expect(result.current.decisions['flag_holdout_excluded'].variationKey).toBe('td_variation');
  });
});

describe('useDecideAll – holdout exclusion behavior', () => {
  let store: ProviderStateStore;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ProviderStateStore();
    mockClient = createMockClient(true);
  });

  it('should surface holdout decisions across all flags', () => {
    const allDecisions: Record<string, OptimizelyDecision> = {
      flag_no_holdout: {
        variationKey: 'control',
        enabled: true,
        variables: {},
        ruleKey: 'ab_test',
        flagKey: 'flag_no_holdout',
        userContext: {} as OptimizelyUserContext,
        reasons: [],
      },
      flag_in_holdout: createHoldoutDecision({
        flagKey: 'flag_in_holdout',
        reasons: ['User is in holdout group "global_holdout".'],
      }),
    };

    const mockUserContext = createMockUserContext({
      decideAll: vi.fn().mockReturnValue(allDecisions),
    });
    store.setUserContext(mockUserContext);

    const wrapper = createWrapper(store, mockClient);
    const { result } = renderHook(() => useDecideAll(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.decisions['flag_no_holdout'].enabled).toBe(true);
    expect(result.current.decisions['flag_in_holdout'].enabled).toBe(false);
    expect(result.current.decisions['flag_in_holdout'].reasons).toContain('User is in holdout group "global_holdout".');
  });
});

describe('useDecide – holdout with config update', () => {
  it('should reflect updated holdout decision after OPTIMIZELY_CONFIG_UPDATE', async () => {
    const initialDecision = createHoldoutDecision({
      variationKey: 'holdout_variation',
      enabled: false,
      reasons: ['User is in holdout group "global_holdout".'],
    });

    const mockUserContext = createMockUserContext({
      decide: vi.fn().mockReturnValue(initialDecision),
    });

    const { wrapper, fireConfigUpdate } = createProviderWrapper(mockUserContext);
    const { result } = renderHook(() => useDecide('flag_with_holdout'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.decision?.variationKey).toBe('holdout_variation');
    expect(result.current.decision?.enabled).toBe(false);

    const updatedDecision = createHoldoutDecision({
      variationKey: 'td_variation',
      enabled: true,
      ruleKey: 'targeted_delivery_rule',
      reasons: ['Holdout removed. User bucketed into targeted delivery.'],
    });
    (mockUserContext.decide as ReturnType<typeof vi.fn>).mockReturnValue(updatedDecision);

    await act(async () => {
      fireConfigUpdate();
    });

    expect(result.current.decision?.variationKey).toBe('td_variation');
    expect(result.current.decision?.enabled).toBe(true);
  });
});
