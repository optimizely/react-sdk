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

import type { UserInfo } from '../provider/types';

/**
 * Compares two string arrays for value equality (order-insensitive).
 * Used to prevent redundant user context creation when the segments prop
 * is referentially different but value-equal.
 */
export function areSegmentsEqual(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

/**
 * Compares two UserInfo objects for value equality.
 * Used to prevent redundant user context creation when the user prop
 * is referentially different but value-equal.
 */
export function areUsersEqual(user1?: UserInfo, user2?: UserInfo): boolean {
  if (user1 === user2) return true;
  if (!user1 || !user2) return false;
  if (user1.id !== user2.id) return false;

  const attrs1 = user1.attributes || {};
  const attrs2 = user2.attributes || {};

  const keys1 = Object.keys(attrs1);
  const keys2 = Object.keys(attrs2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (attrs1[key] !== attrs2[key]) return false;
  }

  return true;
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
