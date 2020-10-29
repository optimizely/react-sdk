/**
 * Copyright 2020, Optimizely
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

import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

const sharedConfig = {
  input: 'src/index.ts',
  external: [
    '@optimizely/js-sdk-logging',
    '@optimizely/optimizely-sdk',
    'hoist-non-react-statics',
    'prop-types',
    'utility-types',
    'react',
  ],
  plugins: [
    resolve(),
    commonjs({
      include: /node_modules/,
      namedExports: { '@optimizely/js-sdk-logging': ['getLogger'] },
    }),
    typescript(),
  ],
};

const esmConfig = {
  ...sharedConfig,
  output: {
    file: 'dist/react-sdk.esm.js',
    format: 'es',
    globals: {
      react: 'React',
    },
  },
};

const cjsConfig = {
  ...sharedConfig,
  output: {
    file: 'dist/react-sdk.cjs.js',
    format: 'cjs',
    globals: {
      react: 'React',
    },
  },
};

export default [cjsConfig, esmConfig];
