import React, { useEffect, useState } from 'react';
import { createInstance, OptimizelyProvider, useDecision } from '@optimizely/react-sdk';

import { OdpOptions } from '@optimizely/optimizely-sdk/dist/shared_types';
import { OptimizelySegmentOption } from '@optimizely/optimizely-sdk/lib/shared_types';
import Decision from './Decision';

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
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //     handleReadyResult(res);
  //   });
  // };

  /* Try a different SDK Key that has ODP integratino OFF */
  // optimizelyClient = createInstance({ sdkKey: 'Dp4dLTSVkoP8VhYkdb4Z4', logLevel: 'debug' });
  // const [userId] = useState<null>(null);
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Testing ODP network error.  You should see a status 521 in the Console & Network 
    tabs when an ODP function is called.
    
    Monkey patch XMLHttpRequest's open function to make a call to a "down" ODP endpoint
    https://httpstat.us/521 gives a 521 status code but you can choose others to test (https://httpstat.us/ for details)
    */
  // const originalOpen = XMLHttpRequest.prototype.open;
  // XMLHttpRequest.prototype.open = function(method:string, url:string, async:boolean) {
  //   url = url.includes('api.zaius.com') ? 'https://httpstat.us/521' : url;
  //   originalOpen.call(this, method, url, async);
  // };
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Simulate segment API timeout. Expect to see error about the audience fetching */
  // optimizelyClient = createInstance({
  //   sdkKey,
  //   odpOptions: {
  //     segmentsApiTimeout: 10, // too fast timeout 10 or reasonable timeout 5_000
  //   },
  // });
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Call decide for a segment user is not a part of hence user should not qualify. 
    Later make the user part of the segment and call decide again to check if user qualifies
     */
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     setFeatureKey('test_feature_1'); // flag1 or flag2 in the AAT SDK project then try again
  //     setEnableDecision(true);
  //     handleReadyResult(res);
  //   });
  // };

  /* Test Promise version of fetchQualifiedSegments */
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then((res: OptimizelyReturnType) => {
  //     setFeatureKey('flag2');
  //     setEnableDecision(true);
  //     optimizelyClient.fetchQualifiedSegments().then(() => handleReadyResult(res)); 
  //   });
  // };

  /* Cannot test isQualifiedFor since userContext is not exposed (only user)
    You have been testing a hacky way to view the qualified segments by accessing the private property in 
    handleReadyResult (NOT recommended) 
  */
 
  /* createUserContext() is done implicity in the React SDK so we cannot test it here */

  /* React SDK Omits the getVuid().  We've been getting it from localStorage.getItem('optimizely-vuid') for browsers */

  /* Test other ODP segments and events settings including Odp disabled
      disabled?: boolean;
      segmentsCache?: ICache<string, string[]>; // probably too hard to test
      segmentsCacheSize?: number;
      segmentsCacheTimeout?: number;
      segmentsApiTimeout?: number;
      segmentsRequestHandler?: RequestHandler; // probably too hard to test
      segmentManager?: IOdpSegmentManager; // probably too hard to test
      eventFlushInterval?: number;
      eventBatchSize?: number;
      eventQueueSize?: number;
      eventApiTimeout?: number;
      eventRequestHandler?: RequestHandler; // probably too hard to test
      eventManager?: IOdpEventManager; // probably too hard to test
  */
  // optimizelyClient = createInstance({
  //   sdkKey,
  //   odpOptions: {
  //     segmentsCacheSize: 1,
  //   },
  // });
  // const [userId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
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

type OptimizelyReturnType = {
  success: boolean;
  reason?: string;
  message?: string;
};

export default App;
