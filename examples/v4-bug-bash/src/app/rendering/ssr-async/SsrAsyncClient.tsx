'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicPollingClient } from '@/lib/clients';
import { PROJECTS, BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export function SsrAsyncClient() {
  const [client] = useState(() => createBasicPollingClient(PROJECTS.basic.sdkKey));
  return (
    <OptimizelyProvider client={client} user={{ id: 'user-ssr-async' }}>
      <Decision />
    </OptimizelyProvider>
  );
}
