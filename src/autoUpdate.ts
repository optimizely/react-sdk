/**
 * Copyright 2019-2020, Optimizely
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
import { LoggerFacade } from '@optimizely/js-sdk-logging';
import { NOTIFICATION_TYPES } from '@optimizely/optimizely-sdk/lib/utils/enums';

import { ReactSDKClient } from './client';

interface AutoUpdate {
  (
    optimizely: ReactSDKClient,
    type: 'feature' | 'experiment',
    value: string,
    logger: LoggerFacade,
    callback: () => void
  ) : () => void
}

/**
 * Utility to setup listeners for changes to the datafile or user attributes and invoke the provided callback.
 * Returns an unListen function
 */
export const setupAutoUpdateListeners : AutoUpdate = (optimizely, type, value, logger, callback) => {
  if (optimizely === null) {
    return () => {};
  }
  const optimizelyNotificationId = optimizely.notificationCenter.addNotificationListener(
    NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
    () => {
      logger.info(`OPTIMIZELY_CONFIG_UPDATE, re-evaluating ${type}="%s" for user="%s"`, value, optimizely.user.id);
      callback();
    },
  );
  const unregisterConfigUpdateListener = () => optimizely.notificationCenter.removeNotificationListener(optimizelyNotificationId);

  const unregisterUserListener = optimizely.onUserUpdate(() => {
    logger.info(`User update, re-evaluating ${type}="%s" for user="%s"`, value, optimizely.user.id);
    callback();
  });

  return () => {
    unregisterConfigUpdateListener();
    unregisterUserListener();
  };
}
