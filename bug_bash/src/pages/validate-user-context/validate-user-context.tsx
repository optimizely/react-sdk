import React, { useEffect, useState } from 'react';
import { createInstance, OptimizelyProvider, useDecision, withOptimizely } from '@optimizely/react-sdk';
import { OptimizelyReturnType } from '../fetch-qualified-segments/fetch-qualified-segments.types';
import TestComponent from './test-component';

const optimizelyClient = createInstance({
  sdkKey: process.env.REACT_APP_OPTIMIZELY_SDK_KEY,
});

export const ValidateUserContext = () => {
  // This should create a user with id matjaz-user-1, and create an vuid in the local storage
  const [userId] = useState<string>('matjaz-user-1');

  // This should create a user with id matjaz-user-1, and create an vuid in the local storage
  //   const [userId] = useState<null>(null);

  // inspect network tab, you should see that the vuid_xxxxx is not sent in the request, instead 'vuid_overridden' is sent as the vuid and there shouldnt be a fs_userid sent
  //   const [userId] = useState<string>('vuid_overridden');

  const [readyResult, setReadyResult] = useState<OptimizelyReturnType>();

  const prepareClient = () => {
    optimizelyClient.onReady().then(async (res: any) => {
      setReadyResult(res);
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
      {readyResult && (
        <>
          <div> UserID: {optimizelyClient.user.id === null ? 'null' : optimizelyClient.user.id}</div>
          <div> Vuid: {localStorage.getItem('optimizely-vuid')}</div>
        </>
      )}
      {/* {readyResult && !readyResult.success && (
        <div>
          Client failed to intialized. Check console for more details.
          <div>Reason: {readyResult.reason}</div>
          <div>Message: {readyResult.message}</div>
        </div>
      )} */}
      <TestComponent />
    </OptimizelyProvider>
  );
};

export default ValidateUserContext;
