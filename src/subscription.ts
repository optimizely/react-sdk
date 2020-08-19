import { ReactSDKClient, VariableValuesObject } from './client';
import { enums } from '@optimizely/optimizely-sdk';

interface FeatureDecision {
  isEnabled: boolean;
  variables: VariableValuesObject;
}

export function subscribeToFeatureStatus(
  optimizely: ReactSDKClient,
  featureKey: string,
  onUpdate: (decision: FeatureDecision) => void
): () => void {
  const sendLatestStatus = (): void => {
    onUpdate({
      isEnabled: optimizely.isFeatureEnabled(featureKey),
      variables: optimizely.getFeatureVariables(featureKey),
    });
  };
  const optimizelyNotificationId = optimizely.notificationCenter.addNotificationListener(
    enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
    sendLatestStatus
  );
  const unregisterConfigUpdateListener: () => void = () =>
    optimizely.notificationCenter.removeNotificationListener(optimizelyNotificationId);

  const unregisterUserListener = optimizely.onUserUpdate(sendLatestStatus);

  return (): void => {
    unregisterConfigUpdateListener();
    unregisterUserListener();
  };
}
