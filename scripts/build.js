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

const fs = require("fs");
const path = require("path");
const execSync = require("child_process").execSync;

process.chdir(path.resolve(__dirname, ".."));

function exec(command, extraEnv) {
  return execSync(command, {
    stdio: "inherit",
    env: Object.assign({}, process.env, extraEnv)
  });
}

const packageName = 'react-sdk';
const umdName = 'optimizelyReactSdk'

console.log("\nBuilding ES modules...");

exec(`./node_modules/.bin/rollup -c scripts/config.js -f es -o dist/${packageName}.mjs`);

console.log("\nBuilding CommonJS modules...");

exec(`./node_modules/.bin/rollup -c scripts/config.js -f cjs -o dist/${packageName}.js`);

console.log("\nBuilding UMD modules...");

exec(`./node_modules/.bin/rollup -c scripts/config.js -f umd -o dist/${packageName}.umd.js`);

console.log("\nBuilding SystemJS modules...");

exec(`./node_modules/.bin/rollup -c scripts/config.js -f system -o dist/${packageName}.system.js`);
