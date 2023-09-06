import React, { useEffect, useState } from 'react';
import { createInstance, OptimizelyProvider, OptimizelySegmentOption, useDecision } from '@optimizely/react-sdk';

import Decision from './Decision';

const sdkKey = import.meta.env.VITE_SDK_KEY as string; // 💡update in .env.local file
const logLevel = 'debug';

const bugBashLog = (message: string) => {
  console.log(`%c🐞[BUG BASH] - ${message}`, 'color: orange; font-size: 20px;');
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
    [BUG BASH] items should show 2 qualified segments and a viud */
  const [userId, setUserId] = useState<string>('matjaz-user-1');
  const prepareClient = () => {
    optimizelyClient.onReady().then(handleReadyResult);
  };

  /* After a few minutes from the above test, fill in the VUID as the userid.
    The Console tab should now show the same qualified segments and previous userid.
    The Network graphql POST calls should have passed `query {customer(vuid : "vuid_f22c526c1e93406f82294d41e6a")`
    instead of `fs_user_id`
    
    Try deleting the vuid by going to Application tab > Local Storage (left pane) > http://127.0.0.1:5173/ entry then
    delete the optimizely-vuid entry  in the middle pane then refresh the page
    */
  // const [userId, setUserId] = useState<string>('vuid_f22c526c1e93406f82294d41e6a');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* The Console tab should show empty qualified segments and the same vuid */
  // const [userId, setUserId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* The Console tab should not show qualified segments and USER_NOT_READY error since React requires userId for usercontext */
  // const [userId, setUserId] = useState<null>(null);
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Open the Network tab.
    Look for graphql calls that are POST requests (you can ignore the OPTIONS calls)
    Click the latest one and inspect the Payload 
    There should be a `vuid: vuid_xxxxx` as the vuid and there should not be a fs_userid sent */
  // const [userId, setUserId] = useState<string>('vuid_overridden');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* In the Network tab, Clear the network output using the 🚫 button. 
    Make a small change to this file, then look for the number of graphql POST calls.    
    You can also look for the Console message: ODP cache hit. Returning segments from cache "fs_user_id-$XXXXX".*/
  // const [userId, setUserId] = useState<string>('matjaz-user-3');
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

  /* Now the Network tab should show 2 identical graphql POSTs since we're resetting the cache  */
  // const [userId, setUserId] = useState<string>('matjaz-user-3'); 
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };
  // useEffect(() => {
  //   (async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments();  
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.RESET_CACHE]); 
  //     }
  //   })();
  // }, [readyResult?.success]);

  /* Again, in the Network tab should show 2 graphql calls since we're ignoring the cache */
  // const [userId, setUserId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };
  // useEffect(() => {
  //   (async () => {
  //     if (readyResult?.success) {
  //       await optimizelyClient.fetchQualifiedSegments();
  //       await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //     }
  //   })();
  // }, [readyResult?.success]);

  /* There should be an error for the first call to fetchQualifiedSegments the second call should work fine
    because we have a stored VUID that has segments */
  // const [userId, setUserId] = useState<string>('random-user-change-me-every-time');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     await optimizelyClient.fetchQualifiedSegments([OptimizelySegmentOption.IGNORE_CACHE]);
  //     handleReadyResult(res);
  //   });
  // };

  /* Try a different SDK Key that has ODP integration OFF. You'll need to refresh your page*/
  // optimizelyClient = createInstance({ sdkKey: 'Dp4dLTSVkoP8VhYkdb4Z4', logLevel: 'debug' });
  // const [userId, setUserId] = useState<null>(null);
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Testing ODP network error.  You should see a status 521 in the Console & Network 
    tabs when an ODP function is called.
    
    Monkey patch XMLHttpRequest's open function to make a call to a "down" ODP endpoint
    https://httpstat.us/521 gives a 521 status code but you can choose others to test (https://httpstat.us/ for details)
    Use https://httpstat.us/408?sleep=20000 to have the connection timeout after 20 seconds
    */
  // const originalOpen = XMLHttpRequest.prototype.open;
  // XMLHttpRequest.prototype.open = function(method:string, url:string, async:boolean) {
  //   url = url.includes('api.zaius.com') ? 'https://httpstat.us/521' : url;
  //   originalOpen.call(this, method, url, async);
  // };
  // const [userId, setUserId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Simulate segment API timeout. Expect to see error about the audience fetching too fast then update to a reasonable timeout*/
  // optimizelyClient = createInstance({
  //   sdkKey,
  //   odpOptions: {
  //     segmentsApiTimeout: 10, // too fast timeout 10 or reasonable timeout 5_000
  //   },
  // });
  // const [userId, setUserId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Call decide for a segment user is not a part of hence user should not qualify. 
    Later make the user part of the segment and call decide again to check if user 
    Look for results in the HTML page or filter your Console output for DECISION_SERVICE
  */
  // const [userId, setUserId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(async (res: OptimizelyReturnType) => {
  //     setFeatureKey('test_feature_1'); // flag1 or flag2 in the AAT SDK project then try again
  //     setEnableDecision(true);
  //     handleReadyResult(res);
  //   });
  // };

  /* Test Promise version of fetchQualifiedSegments */
  // const [userId, setUserId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then((res: OptimizelyReturnType) => {
  //     setFeatureKey('flag2');
  //     setEnableDecision(true);
  //     optimizelyClient.fetchQualifiedSegments().then(() => handleReadyResult(res));
  //   });
  // };

  /* Test changing a user that is enabled matjaz-user-1 to a disabled matjaz-user-3 
    Look for a button on the HTML.
  */
  // const [userId, setUserId] = useState<string>('matjaz-user-1');
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

  /* React SDK Omits the getVuid().  We've been getting it from localStorage.getItem('optimizely-vuid') for browsers 
    otherwise it's not available for non-browser contexts (react native uses asyncstorage)*/

  /* Test other ODP segments settings including Odp disabled
      disabled?: boolean;
      segmentsCache?: ICache<string, string[]>; // probably too hard to test
      segmentsCacheSize?: number;
      segmentsCacheTimeout?: number;
      segmentsApiTimeout?: number;
      segmentsRequestHandler?: RequestHandler; // probably too hard to test
      segmentManager?: IOdpSegmentManager; // probably too hard to test

    You'll be looking at the Console tab; filter to "cache"
  */
  // optimizelyClient = createInstance({
  //   sdkKey,
  //   odpOptions: {
  //     segmentsCacheSize: 1,
  //   },
  // });
  // const [userId, setUserId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(handleReadyResult);
  // };

  /* Test sending ODP events.
    View the Network tab and look for zaius.gif calls and inspect the Query String Parameters
    Also review the Console tab
  */
  // const [userId, setUserId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(() => {
  //     /* Uncomment each of the following individually  to test scenarios of ODP event data*/
  //     optimizelyClient.sendOdpEvent(
  //       'fullstack', // action
  //       'bug_bash', // type
  //       new Map([['fs_user_id', 'fsUserA']]), // identifiers; feel free to remove the data from here `new Map()` or edit the key-values
  //       new Map([['test_key', 'test_value']]), // data; test with various data types
  //     );
  //     // optimizelyClient.sendOdpEvent(''); // error; shouldn't see associated zaius.gif call
  //     // optimizelyClient.sendOdpEvent(null); // error
  //     // optimizelyClient.sendOdpEvent(undefined); // error
  //   });
  // };

  /* Test when ODP endpoint is down 
    You can ignore OPTIONS or "preflight" requests focusing on xhr GET
  */
  // const originalOpen = XMLHttpRequest.prototype.open;
  // XMLHttpRequest.prototype.open = function(method: string, url: string, async: boolean) {
  //   url =
  //     url.includes('jumbe.zaius.com') && !url.includes('httpstat.us')
  //       ? `https://httpstat.us/521?original_url=${url}`
  //       : url;
  //   originalOpen.call(this, method, url, async);
  // };
  // const [userId, setUserId] = useState<string>('matjaz-user-3');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(() => {
  //     optimizelyClient.sendOdpEvent(  // feel free to add the loop from below
  //       'fullstack',
  //       'bug_bash',
  //       new Map([['fs_user_id', 'fsUserB']]),
  //       new Map([['test_count', 1]])
  //     );
  //   });
  // };

  /* Test other ODP events settings
      disabled?: boolean
      eventFlushInterval?: number; // queuing in a browser is not supported
      eventBatchSize?: number; // queuing in a browser is not supported
      eventQueueSize?: number; // queuing in a browser is not supported
      eventApiTimeout?: number;
      eventRequestHandler?: RequestHandler; // probably too hard to test
      eventManager?: IOdpEventManager; // probably too hard to test
  */
  // optimizelyClient = createInstance({
  //   sdkKey,
  //   odpOptions: {
  //     disabled: true,
  //     eventFlushInterval: 10,
  //   },
  // });
  // const [userId, setUserId] = useState<string>('matjaz-user-2');
  // const prepareClient = () => {
  //   optimizelyClient.onReady().then(() => {
  //     for (let i = 0; i < 10; i++) {
  //       optimizelyClient.sendOdpEvent(
  //         'fullstack',
  //         'bug_bash',
  //         new Map([['fs_user_id', 'fsUserC']]),
  //         new Map([['test_count', i]])
  //       );
  //     }
  //   });
  // };

  /* You should be seeing `client_initialized` & 'identified' implied events in the Network tab throughout your testing */

  /* ⬆️ Tests are above this line ⬆️ */

  useEffect(prepareClient, []);

  return (
    <OptimizelyProvider optimizely={optimizelyClient} user={{ id: userId }}>
      {readyResult?.success && (
        <>
          <h1>Bug Bash</h1>
          <h2>Please open your browser's "Developer tools" (Ctrl-Shift-I) for Console, Network, & Application tabs</h2>
          <pre>
            {enableDecision && featureKey && <Decision userId={userId} featureKey={featureKey} setUserId={setUserId} />}
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

type OptimizelyReturnType = {
  success: boolean;
  reason?: string;
  message?: string;
};

export default App;
