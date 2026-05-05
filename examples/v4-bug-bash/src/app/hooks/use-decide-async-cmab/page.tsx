'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecideAsync } from '@optimizely/react-sdk';
import { createCmabClient } from '@/lib/clients';
import { CMAB_DATAFILE } from '@/lib/datafiles';
import { PROJECTS, CMAB_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecideAsync(CMAB_FLAGS.cmabTest);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createCmabClient(PROJECTS.cmab.sdkKey, CMAB_DATAFILE));
  return (
    <ScenarioLayout
      title="useDecideAsync (CMAB)"
      description="Async decision with Contextual Multi-Armed Bandit. Shows loading while the CMAB prediction is fetched, then renders the decision."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-cmab' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
