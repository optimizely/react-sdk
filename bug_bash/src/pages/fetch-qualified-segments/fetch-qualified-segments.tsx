import React, { useEffect, useState } from "react";
import {
  createInstance,
  OptimizelyProvider,
  useDecision,
} from "@optimizely/react-sdk";
import { OptimizelyReturnType } from "./fetch-qualified-segments.types";

const optimizelyClient = createInstance({
  sdkKey: process.env.REACT_APP_OPTIMIZELY_SDK_KEY,
});

export const FetchQualifiedSegments: React.FC = () => {
  const [isSegmentsFetched, setIsSegmentsFetched] = useState<boolean | null>(
    null
  );
  const [readyResult, setReadyResult] = useState<OptimizelyReturnType>();

  const [userId] = useState<string>("matjaz-user-1");
  // const [userId] = useState<string>("matjaz-user-2");
  // const [userId] = useState<string>("matjaz-user-3");

  const prepareClient = () => {
    console.log("optimizelyClient");
    optimizelyClient.onReady().then(async (res: any) => {
      setReadyResult(res);
      setIsSegmentsFetched(true);
      // console.log(optimizelyClient.isReady());
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
        <div>
          {`Is segments fetched for user ${userId}: ${
            isSegmentsFetched ? "Yes" : "No"
          } `}
        </div>
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

export default FetchQualifiedSegments;
