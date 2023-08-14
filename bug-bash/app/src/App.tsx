import React, { useEffect, useState } from 'react';
import { createInstance, OptimizelyProvider, useDecision } from '@optimizely/react-sdk';
import { OptimizelyReturnType } from './App.types';

import { OdpSegmentManager } from '@optimizely/optimizely-sdk/lib/core/odp/odp_segment_manager';
import { OptimizelySegmentOption } from '@optimizely/optimizely-sdk/lib/core/odp/optimizely_segment_option';

const sdkKey = import.meta.env.VITE_SDK_KEY as string; // update in .env.local file

export const App: React.FC = () => {
  const [featureKey, setFeatureKey] = useState<string>('some_key');
  const [isSegmentsFetched, setIsSegmentsFetched] = useState<boolean | null>(null);
  const [readyResult, setReadyResult] = useState<OptimizelyReturnType>();
  const [enableDecision, setEnableDecision] = useState<boolean>(false);

  /* ⬇️ Tests are below this line ⬇️ */

  // 1. console should show two qualified segments and a viud
  const optimizelyClient = createInstance({ sdkKey });
  const [userId] = useState<string>('matjaz-user-1');
  const prepareClient = () => {
    optimizelyClient.onReady().then(async (res: any) => {
      setReadyResult(res);
      setIsSegmentsFetched(true);
    });
  };

  // 2. console should show three qualified segments and the same viud
  // const optimizelyClient = createInstance({ sdkKey });
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //   });
  // };

  // 3. console should show no qualified segments and the same viud
  // const optimizelyClient = createInstance({ sdkKey });
  // const [userId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //   });
  // };

  // 4. console should show no qualified segments and the same viud
  // const [userId] = useState<null>(null);
  // const optimizelyClient = createInstance({ sdkKey });
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //   });
  // };

  // 5. the network tab zaious call should be sending the vuid_xxxxx as the vuid and there shouldnt be a fs_userid sent
  // const [userId] = useState<string>('vuid_overridden');
  // const optimizelyClient = createInstance({ sdkKey });
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //   });
  // };

  // 6. the network tab should show 2 graphql calls
  // const [userId] = useState<string>('matjaz-user-3');
  // const optimizelyClient = createInstance({ sdkKey });
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //   });
  // };
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
  // const [userId] = useState<string>('matjaz-user-3');
  // const optimizelyClient = createInstance({ sdkKey });
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: any) => {
  //     setReadyResult(res);
  //     setIsSegmentsFetched(true);
  //   });
  // };
  // useEffect(() => {
  //   const callSegments = async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //       await optimizelyClient.fetchQualifiedSegments();
  //     }
  //   };
  //   callSegments();
  // }, [readyResult?.success]);

  // 8. there should be an error for the first call to fetchQualifiedSegments the second call should work fine
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
  // const optimizelyClient = createInstance({ sdkKey });
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
  //   sdkKey,
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
  //   sdkKey,
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
  //   sdkKey,
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

  // 13. call decide for a segment user is not a part of hence user should not qualify,
  // later make the user part of the segment and call decide again to check if user qualifies
  // const optimizelyClient = createInstance({
  //   sdkKey,
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

  /* ⬆️ Tests are above this line ⬆️ */

  useEffect(prepareClient, []);

  return (
    <OptimizelyProvider optimizely={optimizelyClient} user={{ id: userId }}>
      {readyResult?.success && (
        <>
          <h1>Bug Bash Output</h1>
          <h2>Please open your browser's "Developer tools" (Ctrl-Shift-I) for Console output</h2>
          <pre>
            <p>{`Is segments fetched for user '${userId}': ${isSegmentsFetched ? 'Yes' : 'No'} `}</p>
            <p>UserID: {optimizelyClient.user.id === null ? 'null' : optimizelyClient.user.id}</p>
            <p>VUID: {localStorage.getItem('optimizely-vuid')}</p>
            {enableDecision && featureKey && <Decision userId={userId} featureKey={featureKey} />}
          </pre>
        </>
      )}
      {readyResult && !readyResult.success && (
        <pre>
          Client failed to intialized. Check console for more details.
          <p>Reason: {readyResult.reason}</p>
          <p>Message: {readyResult.message}</p>
        </pre>
      )}
    </OptimizelyProvider>
  );
};

function Decision({ userId, featureKey }: { userId: string; featureKey: string }) {
  const [decision, clientReady] = useDecision(featureKey, {}, { overrideUserId: userId });

  if (!clientReady) {
    return <></>;
  }

  const variationKey = decision.variationKey;

  if (variationKey === null) {
    console.log(' decision error: ', decision['reasons']);
  }

  const sortMethod = decision.variables['sort_method'];

  return (
    <p>
      {`Flag ${ decision.enabled ? 'on' : 'off'}. User number ${userId} saw flag variation: ${variationKey} and got products sorted by: ${sortMethod} config variable as part of flag rule: ${
        decision.ruleKey
      }`}
    </p>
  );
}

export default App;
