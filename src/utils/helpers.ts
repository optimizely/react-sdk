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
export function areSegmentsEqual(a?: string[] | null, b?: string[] | null): boolean {
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
