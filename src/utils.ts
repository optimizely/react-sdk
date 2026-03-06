/**
 * Copyright 2019, 2026 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as optimizely from '@optimizely/optimizely-sdk';

export type UserInfo = {
  id: string | null;
  attributes?: optimizely.UserAttributes;
};

export interface OptimizelyDecision extends Omit<optimizely.OptimizelyDecision, 'userContext'> {
  userContext: UserInfo;
}

export function areUsersEqual(user1: UserInfo, user2: UserInfo): boolean {
  if (user1.id !== user2.id) {
    return false;
  }

  const user1Attributes = user1.attributes || {};
  const user2Attributes = user2.attributes || {};

  const user1Keys = Object.keys(user1Attributes);
  const user2Keys = Object.keys(user2Attributes);

  if (user1Keys.length !== user2Keys.length) {
    return false;
  }

  for (const key of user1Keys) {
    if (user1Attributes[key] !== user2Attributes[key]) {
      return false;
    }
  }

  return true;
}

function coerceUnknownAttrsValueForComparison(maybeAttrs: unknown): optimizely.UserAttributes {
  if (typeof maybeAttrs === 'object' && maybeAttrs !== null) {
    return maybeAttrs as optimizely.UserAttributes;
  }
  return {} as optimizely.UserAttributes;
}

/**
 * Equality check applied to override user attributes passed into hooks. Used to determine when we need to recompute
 * a decision because a new set of override attributes was passed into a hook.
 * @param {UserAttributes|undefined} oldAttrs
 * @param {UserAttributes|undefined} newAttrs
 * @returns boolean
 */
export function areAttributesEqual(maybeOldAttrs: unknown, maybeNewAttrs: unknown): boolean {
  const oldAttrs = coerceUnknownAttrsValueForComparison(maybeOldAttrs);
  const newAttrs = coerceUnknownAttrsValueForComparison(maybeNewAttrs);
  const oldAttrsKeys = Object.keys(oldAttrs);
  const newAttrsKeys = Object.keys(newAttrs);
  if (oldAttrsKeys.length !== newAttrsKeys.length) {
    // Different attr count - must update
    return false;
  }
  return oldAttrsKeys.every((oldAttrKey: string) => {
    return oldAttrKey in newAttrs && oldAttrs[oldAttrKey] === newAttrs[oldAttrKey];
  });
}

export function createFailedDecision(flagKey: string, message: string, user: UserInfo): OptimizelyDecision {
  return {
    enabled: false,
    flagKey: flagKey,
    ruleKey: null,
    variationKey: null,
    variables: {},
    reasons: [message],
    userContext: {
      id: user.id,
      attributes: user.attributes,
    },
  };
}

export function sprintf(format: string, ...args: any[]): string {
  let i = 0;
  return format.replace(/%s/g, () => {
    const arg = args[i++];
    const type = typeof arg;
    if (type === 'function') {
      return arg();
    } else if (type === 'string') {
      return arg;
    } else {
      return String(arg);
    }
  });
}

const QUALIFIED = 'qualified';

/**
 * Extracts ODP segments from audience conditions in the datafile.
 * Looks for conditions with `match: 'qualified'` and collects their values.
 */
function extractSegmentsFromConditions(condition: any): string[] {
  if (typeof condition === 'string') {
    return [];
  }

  if (Array.isArray(condition)) {
    const segments: string[] = [];
    condition.forEach((c) => segments.push(...extractSegmentsFromConditions(c)));
    return segments;
  }

  if (condition && typeof condition === 'object' && condition['match'] === 'qualified') {
    return [condition['value']];
  }

  return [];
}

/**
 * Builds the GraphQL query payload for fetching audience segments from ODP.
 */
function buildGraphQLQuery(userId: string, segmentsToCheck: string[]): string {
  const segmentsList = segmentsToCheck.map((s) => `\\"${s}\\"`).join(',');
  return `{"query" : "query {customer(fs_user_id : \\"${userId}\\") {audiences(subset: [${segmentsList}]) {edges {node {name state}}}}}"}`;
}

/**
 * Fetches qualified ODP segments for a user given a datafile and user ID.
 *
 * This is a standalone, self-contained utility that:
 * 1. Parses the datafile to extract ODP configuration (apiKey, apiHost)
 * 2. Collects all ODP segments referenced in audience conditions
 * 3. Queries the ODP GraphQL API
 * 4. Returns only the segments where the user is qualified
 *
 * @param userId - The user ID to fetch qualified segments for
 * @param datafile - The Optimizely datafile (JSON object or string)
 * @returns Array of qualified segment names, empty array if no segments configured,
 *          or null if ODP is not integrated or the fetch fails.
 *
 * @example
 * ```ts
 * const segments = await getQualifiedSegments('user-123', datafile);
 * if (segments) {
 *   console.log('Qualified segments:', segments);
 * }
 * ```
 */
export async function getQualifiedSegments(
  userId: string,
  datafile: string | Record<string, any>
): Promise<string[] | null> {
  let datafileObj: any;

  if (typeof datafile === 'string') {
    try {
      datafileObj = JSON.parse(datafile);
    } catch {
      return null;
    }
  } else if (typeof datafile === 'object') {
    datafileObj = datafile;
  } else {
    return null;
  }

  // Extract ODP integration config from datafile
  let apiKey = '';
  let apiHost = '';
  let odpIntegrated = false;

  if (Array.isArray(datafileObj.integrations)) {
    for (const integration of datafileObj.integrations) {
      if (integration.key === 'odp') {
        odpIntegrated = true;
        apiKey = integration.publicKey || '';
        apiHost = integration.host || '';
        break;
      }
    }
  }

  if (!odpIntegrated || !apiKey || !apiHost) {
    return null;
  }

  // Collect all ODP segments from audience conditions
  const allSegments = new Set<string>();
  const audiences = [...(datafileObj.audiences || []), ...(datafileObj.typedAudiences || [])];

  for (const audience of audiences) {
    if (audience.conditions) {
      const conditions =
        typeof audience.conditions === 'string' ? JSON.parse(audience.conditions) : audience.conditions;
      extractSegmentsFromConditions(conditions).forEach((s) => allSegments.add(s));
    }
  }

  const segmentsToCheck = Array.from(allSegments);
  if (segmentsToCheck.length === 0) {
    return [];
  }

  const endpoint = `${apiHost}/v3/graphql`;
  const query = buildGraphQLQuery(userId, segmentsToCheck);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: query,
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();

    if (json.errors?.length > 0) {
      return null;
    }

    const edges = json?.data?.customer?.audiences?.edges;
    if (!edges) {
      return null;
    }

    return edges.filter((edge: any) => edge.node.state === QUALIFIED).map((edge: any) => edge.node.name);
  } catch {
    return null;
  }
}
