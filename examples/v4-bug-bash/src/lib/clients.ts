import {
  createInstance,
  createStaticProjectConfigManager,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
  OptimizelyDecideOption,
  createLogger,
  DEBUG,
  createForwardingEventProcessor,
} from '@optimizely/react-sdk';
// TODO: UserProfileServiceAsync should be exported from @optimizely/optimizely-sdk (it's in shared_types but missing from export_types)
import type { UserProfile } from '@optimizely/react-sdk';

interface UserProfileServiceAsync {
  lookup(userId: string): Promise<UserProfile>;
  save(profile: UserProfile): Promise<void>;
}

const logger = createLogger({ level: DEBUG });

export function createBasicStaticClient(datafile: string) {
  return createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile }),
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
    eventProcessor: createForwardingEventProcessor(),
    logger,
  });
}

export function createBasicPollingClient(sdkKey: string, datafile?: string) {
  return createInstance({
    projectConfigManager: createPollingProjectConfigManager({ sdkKey, datafile }),
    eventProcessor: createBatchEventProcessor(),
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
    logger,
  });
}

export function createOdpClient(sdkKey: string, datafile: string, options: { vuid?: boolean } = {}) {
  return createInstance({
    projectConfigManager: createPollingProjectConfigManager({ sdkKey, datafile }),
    eventProcessor: createBatchEventProcessor(),
    odpManager: createOdpManager(),
    ...(options.vuid
      ? {
          vuidManager: createVuidManager({
            enableVuid: true,
          }),
        }
      : {}),
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
    logger,
  });
}

export function createCmabClient(sdkKey: string, datafile: string) {
  return createInstance({
    projectConfigManager: createPollingProjectConfigManager({ sdkKey, datafile }),
    eventProcessor: createBatchEventProcessor(),
    cmab: {
      cacheSize: 100,
      cacheTtl: 600,
    },
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
    logger,
  });
}

export function createServerClient(datafile: string) {
  return createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile }),
    disposable: true,
    defaultDecideOptions: [OptimizelyDecideOption.DISABLE_DECISION_EVENT, OptimizelyDecideOption.INCLUDE_REASONS],
    logger,
  });
}

export function createBasicStaticClientWithUps(datafile: string, userProfileServiceAsync: UserProfileServiceAsync) {
  return createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile }),
    userProfileServiceAsync,
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
    logger,
    eventProcessor: createForwardingEventProcessor(),
  });
}
