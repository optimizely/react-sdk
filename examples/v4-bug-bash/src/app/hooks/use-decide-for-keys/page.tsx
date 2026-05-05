'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecideForKeys } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionTable } from '@/components/DecisionTable';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const FLAG_KEYS = [BASIC_FLAGS.flag1, BASIC_FLAGS.flag2];

function Decisions() {
  const { decisions, isLoading, error } = useDecideForKeys(FLAG_KEYS);
  return <DecisionTable decisions={decisions} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="useDecideForKeys"
      description="Decides multiple flags by key. Returns { decisions, isLoading, error } where decisions is a Record<string, OptimizelyDecision>."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-for-keys' }}>
        <Decisions />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
