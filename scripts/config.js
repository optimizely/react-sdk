/**
 * Copyright 2019, 2023 Optimizely
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

const typescript = require('rollup-plugin-typescript2');
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const terser = require('@rollup/plugin-terser');

const packageDeps = require('../package.json').dependencies || {};
const packagePeers = require('../package.json').peerDependencies || {};

function getExternals(externals) {
  let externalLibs;
  if (externals === 'forBrowsers') {
    externalLibs = ['react'];
  } else {
    externalLibs =
      externals === 'peers' ? Object.keys(packagePeers) : Object.keys(packageDeps).concat(Object.keys(packagePeers));
  }
  externalLibs.push('crypto');
  return externalLibs;
}

function getPlugins(env, externals) {
  const plugins = [
    nodeResolve({
      browser: externals === 'forBrowsers',
      preferBuiltins: externals !== 'forBrowsers',
    }),
    commonjs({
      include: /node_modules/,
    }),
  ];

  if (env) {
    plugins.push(
      replace({
        'process.env.NODE_ENV': JSON.stringify(env),
        preventAssignment: false,
      })
    );
  }

  plugins.push(typescript());

  if (env === 'production') {
    plugins.push(terser());
  }

  return plugins;
}

const config = {
  input: 'src/index.ts',
  output: {
    globals: {
      react: 'React',
      crypto: 'crypto',
    },
  },
  external: getExternals(process.env.EXTERNALS),
  plugins: getPlugins(process.env.BUILD_ENV, process.env.EXTERNALS),
};

module.exports = config;
