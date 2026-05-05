'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecideForKeysAsync } from '@optimizely/react-sdk';
import { createCmabClient } from '@/lib/clients';
import { CMAB_DATAFILE } from '@/lib/datafiles';
import { PROJECTS, CMAB_FLAGS } from '@/lib/config';
import { DecisionTable } from '@/components/DecisionTable';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const FLAG_KEYS = [CMAB_FLAGS.cmabTest];

function Decisions() {
  const { decisions, isLoading, error } = useDecideForKeysAsync(FLAG_KEYS);
  return <DecisionTable decisions={decisions} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createCmabClient(PROJECTS.cmab.sdkKey, CMAB_DATAFILE));
  return (
    <ScenarioLayout
      title="useDecideForKeysAsync"
      description="Async multi-flag decision with CMAB project. Shows loading then resolves with a decisions map for the specified flag keys."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-for-keys-async' }}>
        <Decisions />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
