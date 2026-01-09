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

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json' with { type: 'json' };

const { dependencies, peerDependencies } = pkg;
const external = [...Object.keys(dependencies || {}), ...Object.keys(peerDependencies || {}), 'crypto'];

const typescriptPluginOptions = {
  exclude: ['./dist', '**/*.spec.ts', '**/*.spec.tsx'],
  include: ['./src/**/*.ts', './src/**/*.tsx'],
};

const cjsBundle = (minify = true) => ({
  input: 'src/index.ts',
  external,
  plugins: [resolve({ browser: true }), commonjs(), typescript(typescriptPluginOptions), minify && terser()].filter(
    Boolean
  ),
  output: {
    file: `dist/react-sdk${minify ? '.min' : ''}.js`,
    format: 'cjs',
    exports: 'named',
    sourcemap: true,
    globals: { react: 'React' },
  },
});

const esmBundle = (minify = true) => ({
  input: 'src/index.ts',
  external,
  plugins: [resolve({ browser: true }), commonjs(), typescript(typescriptPluginOptions), minify && terser()].filter(
    Boolean
  ),
  output: {
    file: `dist/react-sdk.es${minify ? '.min' : ''}.js`,
    format: 'es',
    sourcemap: true,
  },
});

const umdBundle = (minify = true) => ({
  input: 'src/index.ts',
  external: ['react'],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    typescript(typescriptPluginOptions),
    minify && terser(),
  ].filter(Boolean),
  output: {
    file: `dist/react-sdk.umd${minify ? '.min' : ''}.js`,
    format: 'umd',
    name: 'optimizelyReactSdk',
    exports: 'named',
    sourcemap: true,
    globals: { react: 'React' },
  },
});

const bundles = {
  'cjs-min': cjsBundle(true),
  cjs: cjsBundle(false),
  'esm-min': esmBundle(true),
  esm: esmBundle(false),
  'umd-min': umdBundle(true),
  umd: umdBundle(false),
};

export default (args) => {
  const patterns = Object.keys(args)
    .filter((arg) => arg.startsWith('config-'))
    .map((arg) => arg.replace(/config-/, ''));

  if (!patterns.length) {
    // Default: build minified versions only
    return [bundles['cjs-min'], bundles['esm-min'], bundles['umd-min']];
  }

  return Object.entries(bundles)
    .filter(([name]) => patterns.some((pattern) => name.match(pattern)))
    .map(([, config]) => config);
};
