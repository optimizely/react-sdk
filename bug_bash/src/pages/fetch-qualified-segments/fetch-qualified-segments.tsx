import React, { useEffect, useState } from 'react';
import { createInstance, OptimizelyProvider, useDecision } from '@optimizely/react-sdk';
import { OptimizelyReturnType } from './fetch-qualified-segments.types';
import { OptimizelySegmentOption } from '@optimizely/optimizely-sdk';
import { OdpSegmentManager } from '@optimizely/optimizely-sdk/lib/core/odp/odp_segment_manager';

// const optimizelyClient = createInstance({
//   sdkKey: process.env.REACT_APP_OPTIMIZELY_SDK_KEY,
// });

export const FetchQualifiedSegments: React.FC = () => {
  // const optimizelyClient = createInstance({
  //   sdkKey: 'KZbunNn9bVfBWLpZPq2XC4',
  // });
  const [featureKey, setFeatureKey] = useState<string>('some_key');
  const [isSegmentsFetched, setIsSegmentsFetched] = useState<boolean | null>(null);
  const [readyResult, setReadyResult] = useState<OptimizelyReturnType>();

  const [enableDecision, setEnableDecision] = useState<boolean>(false);
  // 1. console should show two qualified segments and a viud
  // const [userId] = useState<string>('matjaz-user-1');

  // 2. console should show three qualified segments and the same viud
  // const [userId] = useState<string>('matjaz-user-2');

  // 3. console should show no qualified segments and the same viud
  // const [userId] = useState<string>('matjaz-user-3');

  // 4. console should show no qualified segments and the same viud
  // const [userId] = useState<null>(null);

  // 5. the network tab zaious call should be sending the vuid_xxxxx as the vuid and there shouldnt be a fs_userid sent
  // const [userId] = useState<string>('vuid_overridden');

  // 6. the network tab should show 2 graphql calls
  // useEffect(() => {
  //   const callSegments = async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.RESET_CACHE]);
  //       await optimizelyClient.fetchQualifiedSegments();
  //     }
  //   };
  //   callSegments();
  // }, [readyResult?.success]);

  // 7. the network tab should show 2 graphql calls
  // useEffect(() => {
  //   const callSegments = async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //       await optimizelyClient.fetchQualifiedSegments();
  //     }
  //   };
  //   callSegments();
  // }, [readyResult?.success]);

  // 8. there should be an error for the second call to fetchQualifiedSegments the second call should work fine
  // const [userId] = useState<string>('random-user-id');

  // const prepareClient = () => {
  //   console.log('optimizelyClient');
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //   });
  // };

  // 9. fetch should return error in the console, for segment fetch
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  // });
  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //   });
  // };

  // 10. odp network error
  // const optimizelyClient = createInstance({
  //   logLevel: 'debug',
  //   sdkKey: 'KZbunNn9bVfBWLpZPq2XC4', // '4XLn6c6LsxMuYKVBLtaKp',
  //   datafileOptions: {
  //     urlTemplate: 'https://httpstat.us/521?sdkKey=%s',
  //   },
  // });
  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //   });
  // };

  // 11. segment api timeout error
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  //   odpOptions: {
  //     segmentsApiTimeout: 1,
  //   },
  // });
  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //   });
  // };

  // 12. should work fine for proper timeout value
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  //   odpOptions: {
  //     segmentsApiTimeout: 100000,
  //   },
  // });
  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //   });
  // };

  // useEffect(prepareClient, []);

  // 14. call decide for a segment user is not a part of hence user should not qualify,
  // later make the user part of the segment and call decide again to check if user qualifies
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  // });
  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setFeatureKey('test_feature_1')
  //     setIsSegmentsFetched(true);
  //     setEnableDecision(true);
  //   });
  // };

  // 15. test fetchQualifiedSegments with different odpOptions
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  //   odpOptions: {
  //     segmentsCacheSize: 1,
  //     segmentsApiTimeout: 100000,
  //     segmentManager: new OdpSegmentManager()
  //     segmentsCache: true,
  //     eventManager:true,
  //     eventApiTimeout: 100000,
  //     eventFlushInterval: 100000,
  //   }
  // });

  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     optimizelyClient.fetchQualifiedSegments();
  //     optimizelyClient.sendOdpEvent(
  //           'ttype',
  //           '',
  //           new Map([['FS-USER-ID', 'raju.ahmed2@optimizely.com']]),
  //           new Map([["foo", "bar"]]),
  //         );
  //   });
  // };

  // 16. test sendOdpEvent with multiple types of data and check in event inspector
  // const odpEventType = 'string';
  // // const odpEventType = 'boolean';
  // // const odpEventType = 'number';
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  // });

  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     optimizelyClient.sendOdpEvent(
  //       'ttype',
  //       odpEventType,
  //       new Map([['FS-USER-ID', 'raju.ahmed2@optimizely.com']]),
  //       new Map([['foo', 'bar']])
  //     );
  //   });
  // };

  // 17. test identifier vuid key in sendevent
  // const optimizelyClient = createInstance({
  //   sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  // });

  // const [userId] = useState<string>('matjaz-user-2');

  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //     optimizelyClient.sendOdpEvent(
  //       'ttype',
  //       '',
  //       new Map([['FS-USER-ID', 'raju.ahmed2@optimizely.com']]),
  //       new Map([['foo', 'bar']])
  //     );
  //   });
  // };

  // 18. test identifier should return bad request 400
  const optimizelyClient = createInstance({
    sdkKey: 'TbrfRLeKvLyWGusqANoeR',
  });

  const [userId] = useState<string>('matjaz-user-2');

  const prepareClient = () => {
    optimizelyClient.onReady().then(async (res: any) => {
      setReadyResult(res);
      setIsSegmentsFetched(true);
      optimizelyClient.sendOdpEvent('ttype', '', new Map([['test', 'test']]));
    });
  };

  useEffect(prepareClient, []);

  return (
    <OptimizelyProvider
      optimizely={optimizelyClient}
      // Generally React SDK runs for one client at a time i.e for one user throughout the lifecycle.
      // You can provide the user Id here once and the SDK will memoize and reuse it throughout the application lifecycle.
      // For this example, we are simulating 10 different users so we will ignore this and pass override User IDs to the useDecision hook for demonstration purpose.
      user={{ id: userId }}
    >
      {readyResult?.success && (
        <>
          <div>{`Is segments fetched for user ${userId}: ${isSegmentsFetched ? 'Yes' : 'No'} `}</div>
          <div> UserID: {optimizelyClient.user.id === null ? 'null' : optimizelyClient.user.id}</div>
          <div> Vuid: {localStorage.getItem('optimizely-vuid')}</div>
          {enableDecision && featureKey && <Decision userId={userId} featureKey={featureKey} />}
        </>
      )}
      {readyResult && !readyResult.success && (
        <div>
          Client failed to intialized. Check console for more details.
          <div>Reason: {readyResult.reason}</div>
          <div>Message: {readyResult.message}</div>
        </div>
      )}
    </OptimizelyProvider>
  );
};

function Decision({ userId, featureKey }: { userId: string; featureKey: string }) {
  // Generally React SDK runs for one client at a time i.e for one user throughout the lifecycle.
  // You can provide the user Id once while wrapping the app in the Provider component and the SDK will memoize and reuse it throughout the application lifecycle.
  // For this example, we are simulating 10 different users so we will ignore this and pass override User IDs to the useDecision hook for demonstration purpose.
  // This override will not be needed for normal react sdk use cases.
  // return null;

  const [decision, clientReady] = useDecision(featureKey, {}, { overrideUserId: userId });

  // Don't render the component if SDK client is not ready yet.
  if (!clientReady) {
    return <></>;
  }

  const variationKey = decision.variationKey;

  // did decision fail with a critical error?
  if (variationKey === null) {
    console.log(' decision error: ', decision['reasons']);
  }

  // get a dynamic configuration variable
  // "sort_method" corresponds to a variable key in your Optimizely project
  const sortMethod = decision.variables['sort_method'];

  return (
    <div>
      {`\nFlag ${
        decision.enabled ? 'on' : 'off'
      }. User number ${userId} saw flag variation: ${variationKey} and got products sorted by: ${sortMethod} config variable as part of flag rule: ${
        decision.ruleKey
      }`}
    </div>
  );
}

export default FetchQualifiedSegments;
