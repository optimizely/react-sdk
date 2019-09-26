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

const typescript = require('rollup-plugin-typescript2')
const commonjs = require('rollup-plugin-commonjs')
const replace = require('rollup-plugin-replace')
const resolve = require('rollup-plugin-node-resolve')
const { uglify } = require('rollup-plugin-uglify')

const packageDeps = require('../package.json').dependencies || {}
const packagePeers = require('../package.json').peerDependencies || {}

function getExternals(externals) {
  return externals === 'peers'
    ? Object.keys(packagePeers)
    : Object.keys(packageDeps).concat(Object.keys(packagePeers))
}

function getPlugins(env) {
  const plugins = [
    resolve(),
    commonjs({
      include: /node_modules/,
      namedExports: { '@optimizely/js-sdk-logging': ['getLogger'] },
    }),
  ]

  if (env) {
    plugins.push(
      replace({
        'process.env.NODE_ENV': JSON.stringify(env),
      }),
    )
  }

  plugins.push(typescript())

  if (env === 'production') {
    plugins.push(uglify())
  }

  return plugins
}

const config = {
  input: 'src/index.ts',
  output: {
    globals: {
      react: 'React',
    },
  },
  external: getExternals(process.env.EXTERNALS),
  plugins: getPlugins(process.env.BUILD_ENV),
}

module.exports = config
