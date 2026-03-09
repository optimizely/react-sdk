/**
 * Copyright 2026 Optimizely
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

import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import pkg from './package.json' with { type: 'json' };

const { dependencies, peerDependencies } = pkg;
const externalDeps = [...Object.keys(dependencies || {}), ...Object.keys(peerDependencies || {}), 'crypto'];
const external = (id) => externalDeps.some((dep) => id === dep || id.startsWith(dep + '/'));

export default {
  input: '.build/index.js',
  external,
  plugins: [resolve({ browser: true }), terser()],
  output: {
    file: 'dist/react-sdk.es.min.mjs',
    format: 'es',
    sourcemap: true,
  },
};
