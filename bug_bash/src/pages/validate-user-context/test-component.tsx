import React, { useEffect } from 'react';
import { ReactSDKClient, withOptimizely } from '@optimizely/react-sdk';

function TestComponent(props: any) {
  console.log(props);
  const { optimizely } = props;
  const client: ReactSDKClient = optimizely;
  useEffect(() => {
    console.log(client.user.id);
  }, []);

  return <div>TestComponent</div>;
}

export default withOptimizely(TestComponent);
