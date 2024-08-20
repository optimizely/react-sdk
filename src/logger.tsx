/**
 * Copyright 2022, Optimizely
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

import * as optimizely from '@optimizely/optimizely-sdk';
import { sprintf } from './utils';

const logHandler = optimizely.getLogger('ReactSDK');

export const logger = {
  warn: (msg: string, ...splat: any[]) => {
    return logHandler.log(optimizely.enums.LOG_LEVEL.WARNING, sprintf(msg, ...splat));
  },
  info: (msg: string, ...splat: any[]) => {
    return logHandler.log(optimizely.enums.LOG_LEVEL.INFO, sprintf(msg, ...splat));
  },
  debug: (msg: string, ...splat: any[]) => {
    return logHandler.log(optimizely.enums.LOG_LEVEL.DEBUG, sprintf(msg, ...splat));
  },
  error: (msg: string, ...splat: any[]) => {
    return logHandler.log(optimizely.enums.LOG_LEVEL.ERROR, sprintf(msg, ...splat));
  },
};
