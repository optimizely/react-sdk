'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecideAll } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { DecisionTable } from '@/components/DecisionTable';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function AllDecisions() {
  const { decisions, isLoading, error } = useDecideAll();
  return <DecisionTable decisions={decisions} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="useDecideAll"
      description="Decides all active flags. Returns { decisions, isLoading, error } with every flag decision in the project."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-all' }}>
        <AllDecisions />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
