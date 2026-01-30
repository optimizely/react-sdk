/**
 * Copyright 2019, Optimizely
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

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['./src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  preset: 'ts-jest',

  // Temporarily run only these directories during rewrite
  // Add new paths as migration progresses
  // TODO: Revert to testRegex after migration: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$'
  testMatch: [
    '<rootDir>/src/provider/**/*.spec.{ts,tsx}',
    '<rootDir>/src/client/**/*.spec.{ts,tsx}',
    // '<rootDir>/src/hooks/**/*.spec.{ts,tsx}',
  ],
};
