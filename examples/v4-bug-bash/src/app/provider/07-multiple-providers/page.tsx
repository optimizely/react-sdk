'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision({ prefix }: { prefix: string }) {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix={prefix} decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));

  return (
    <ScenarioLayout
      title="07 — Multiple Providers"
      description="Two OptimizelyProvider wrappers sharing the same client with different timeouts. Both should render decisions."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <h3>Provider A (timeout=100)</h3>
          <OptimizelyProvider client={client} user={{ id: 'user-07-a' }} timeout={100}>
            <Decision prefix="decision-a" />
          </OptimizelyProvider>
        </div>
        <div>
          <h3>Provider B (timeout=5000)</h3>
          <OptimizelyProvider client={client} user={{ id: 'user-07-b' }} timeout={5000}>
            <Decision prefix="decision-b" />
          </OptimizelyProvider>
        </div>
      </div>
    </ScenarioLayout>
  );
}
