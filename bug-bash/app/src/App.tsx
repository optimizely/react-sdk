import React, { useEffect, useState } from 'react';
import { createInstance, OptimizelyProvider, useDecision } from '@optimizely/react-sdk';

import { OptimizelySegmentOption } from '@optimizely/optimizely-sdk';

const sdkKey = import.meta.env.VITE_SDK_KEY as string; // update in .env.local file
const logLevel = 'info'; // adjust as you needed; 'debug' needed later

const bugBashLog = (message: string) => {
  console.log(`%c🐝[BUG BASH] - ${message}`, 'color: orange; font-size: 20px;');
};
export const App: React.FC = () => {
  const [featureKey, setFeatureKey] = useState<string>('some_key');
  const [readyResult, setReadyResult] = useState<OptimizelyReturnType>();
  const [enableDecision, setEnableDecision] = useState<boolean>(false);

  // Using let here because we need to reassign the client in some tests
  let optimizelyClient = createInstance({ sdkKey, logLevel });

  const handleReadyResult = async (res: OptimizelyReturnType) => {
    const userContext = optimizelyClient?.userContext;
    if (userContext) {
      bugBashLog(`_qualifiedSegments: ${optimizelyClient['userContext']['_qualifiedSegments'] as string}`);
    } else {
      bugBashLog(`userContext is null`);
    }

    if (userId) {
      bugBashLog(`userId: ${userId}`);
    }

    const currentVuid = localStorage.getItem('optimizely-vuid');
    if (currentVuid) {
      bugBashLog(`vuid: ${currentVuid}`);
    }

    setReadyResult(res);
  };

  /* ⬇️ Tests are below this line ⬇️ */

  /* Open the Developer Tools > Console tab
    [BUG BASH 🐝] items should show two qualified segments and a viud */
  // const [userId] = useState<string>('matjaz-user-1');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* The Console tab should now show three qualified segments and the same viud */
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* The Console tab should now show no qualified segments and the same vuid */
  // const [userId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* The Console tab should show no qualified segments and the same vuid */
  // const [userId] = useState<null>(null);
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Open the Network tab.
    Look for graphql calls that are POST requests (you can ignore the OPTIONS calls)
    Click the latest one and inspect the Payload 
    There should be a `vuid: vuid_xxxxx` as the vuid and there should not be a fs_userid sent */
  // const [userId] = useState<string>('vuid_overridden');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* In the Network tab, there should be 1 graphql POST calls since we're using the cache */
  // const [userId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };
  // useEffect(() => {
  //   (async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments();
  //       await optimizelyClient.fetchQualifiedSegments();
  //     }
  //   })();
  // }, [readyResult?.success]);

  /* Now the Network tab should show 2 identical graphql POSTs since we're resetting the cache */
  // const [userId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };
  // useEffect(() => {
  //   (async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.RESET_CACHE]);
  //       await optimizelyClient.fetchQualifiedSegments();
  //     }
  //   })();
  // }, [readyResult?.success]);

  /* Again, in the Network tab should show 2 graphql calls since we're ignoring the cache */
  // const [userId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };
  // useEffect(() => {
  //   (async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //       await optimizelyClient.fetchQualifiedSegments();
  //     }
  //   })();
  // }, [readyResult?.success]);

  /* There should be an error for the first call to fetchQualifiedSegments the second call should work fine
    because we have a stored VUID that has segments */
  // const [userId] = useState<string>('random-user-id');
  // const prepareClient = () => {
  //   // not using handleReadyResult here because we want to test the error
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //     setReadyResult(res);
  //   });
  // };

  /* 9. fetch should return error in the console, for segment fetch */
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //     setReadyResult(res);
  //   });
  // };

  /* 10. Testing ODP network error.  You should see a status 521 in the Console & Network tabs */
  optimizelyClient = createInstance({
    logLevel,
    sdkKey,
    datafileOptions: {
      urlTemplate: 'https://httpstat.us/521?sdkKey=%s',
    },
  });
  const [userId] = useState<string>('matjaz-user-2');
  const prepareClient = () => {
    optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
      await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
      setReadyResult(res);
    });
  };

  // 11. segment api timeout error
  // const optimizelyClient = createInstance({
  //   sdkKey,
  //   odpOptions: {
  //     segmentsApiTimeout: 1,
  //   },
  // });
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     setReadyResult(res);
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
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     setReadyResult(res);
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //   });
  // };
  // useEffect(prepareClient, []);

  // 13. call decide for a segment user is not a part of hence user should not qualify,
  // later make the user part of the segment and call decide again to check if user qualifies
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     setReadyResult(res);
  //     setFeatureKey('test_feature_1')
  //     setEnableDecision(true);
  //   });
  // };

  /* ⬆️ Tests are above this line ⬆️ */

  useEffect(prepareClient, []);

  return (
    <OptimizelyProvider optimizely={optimizelyClient} user={{ id: userId }}>
      {readyResult?.success && (
        <>
          <h1>Bug Bash</h1>
          <h2>Please open your browser's "Developer tools" (Ctrl-Shift-I) for Console, Network, & Application tabs</h2>
          <pre>{enableDecision && featureKey && <Decision userId={userId} featureKey={featureKey} />}</pre>
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
      {`Flag ${
        decision.enabled ? 'on' : 'off'
      }. User number ${userId} saw flag variation: ${variationKey} and got products sorted by: ${sortMethod} config variable as part of flag rule: ${
        decision.ruleKey
      }`}
    </p>
  );
}

export type OptimizelyReturnType = {
  success: boolean;
  reason?: string;
  message?: string;
};

export default App;
