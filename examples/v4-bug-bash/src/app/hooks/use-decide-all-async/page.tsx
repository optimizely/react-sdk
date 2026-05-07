'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecideAllAsync } from '@optimizely/react-sdk';
import { createCmabClient } from '@/lib/clients';
import { CMAB_DATAFILE } from '@/lib/datafiles';
import { PROJECTS } from '@/lib/config';
import { DecisionTable } from '@/components/DecisionTable';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function AllDecisions() {
  const { decisions, isLoading, error } = useDecideAllAsync();
  return <DecisionTable decisions={decisions} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createCmabClient(PROJECTS.cmab.sdkKey, CMAB_DATAFILE));
  return (
    <ScenarioLayout
      title="useDecideAllAsync"
      description="Async all-flags decision with CMAB project. Shows loading then resolves with decisions for every active flag."
      code={`// Hook usage — async all-flags decision
const { decisions, isLoading, error } = useDecideAllAsync();

// Client — CMAB enabled
const client = createInstance({
  projectConfigManager: createPollingProjectConfigManager({ sdkKey, datafile }),
  eventProcessor: createBatchEventProcessor(),
  cmab: { cacheSize: 100, cacheTtl: 600 },
  defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
});`}
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-all-async' }}>
        <AllDecisions />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
