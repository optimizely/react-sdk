'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export function SsrSyncClient({ datafile }: { datafile: string }) {
  const [client] = useState(() => createBasicStaticClient(datafile));
  return (
    <OptimizelyProvider client={client} user={{ id: 'user-ssr-sync' }}>
      <Decision />
    </OptimizelyProvider>
  );
}
