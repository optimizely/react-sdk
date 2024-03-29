/**
 * Copyright 2020, 2023 Optimizely
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
import { enums } from '@optimizely/optimizely-sdk';
import { ReactSDKClient } from './client';
import { LoggerFacade } from '@optimizely/optimizely-sdk/dist/modules/logging';

interface AutoUpdate {
  (
    optimizely: ReactSDKClient,
    type: 'Feature' | 'Experiment',
    value: string,
    logger: LoggerFacade,
    callback: () => void
  ): () => void;
}

/**
 * Utility to setup listeners for changes to the datafile or user attributes and invoke the provided callback.
 * Returns an unListen function
 */
export const setupAutoUpdateListeners: AutoUpdate = (optimizely, type, value, logger, callback) => {
  const loggerSuffix = `re-evaluating ${type}="${value}" for user="${optimizely.user.id}"`;
  const optimizelyNotificationId = optimizely.notificationCenter.addNotificationListener(
    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
    () => {
      logger.info(`${enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE}, ${loggerSuffix}`);
      callback();
    }
  );
  const unregisterConfigUpdateListener: () => void = () =>
    optimizely.notificationCenter.removeNotificationListener(optimizelyNotificationId);

  const unregisterUserListener = optimizely.onUserUpdate(() => {
    logger.info(`User update, ${loggerSuffix}`);
    callback();
  });

  return (): void => {
    unregisterConfigUpdateListener();
    unregisterUserListener();
  };
};
