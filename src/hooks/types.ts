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

import type { OptimizelyDecideOption, OptimizelyDecision } from '@optimizely/optimizely-sdk';

export interface UseDecideConfig {
  decideOptions?: OptimizelyDecideOption[];
}

export type UseDecideResult =
  | { isLoading: true; error: null; decision: null }
  | { isLoading: false; error: Error; decision: OptimizelyDecision | null }
  | { isLoading: false; error: null; decision: OptimizelyDecision };

export type UseDecideMultiResult =
  | { isLoading: true; error: null; decisions: Record<string, never> }
  | { isLoading: false; error: Error; decisions: Record<string, OptimizelyDecision> }
  | { isLoading: false; error: null; decisions: Record<string, OptimizelyDecision> };
