'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicPollingClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { PROJECTS, BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicPollingClient(PROJECTS.basic.sdkKey, BASIC_DATAFILE));

  return (
    <ScenarioLayout
      title="02 — User + Datafile + SDK Key"
      description="Polling config manager with both SDK key and datafile. Decision should be available immediately (datafile pre-loaded), with live polling in background."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-02' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
