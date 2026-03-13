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

import { useRef } from 'react';

/**
 * Returns a referentially stable array reference as long as the elements
 * are shallowly equal. Prevents unnecessary re-renders when consumers
 * pass inline arrays (e.g. `decideOptions: [EXCLUDE_VARIABLES]`).
 */
export function useStableArray<T>(arr: T[] | undefined): T[] | undefined {
  const ref = useRef<T[] | undefined>(arr);

  if (!shallowEqualArrays(ref.current, arr)) {
    ref.current = arr;
  }

  return ref.current;
}

function shallowEqualArrays<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }

  return true;
}
