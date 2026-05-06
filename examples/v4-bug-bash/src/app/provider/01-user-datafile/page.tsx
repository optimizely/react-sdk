'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  console.log('[REACTTTT render check', { decision, isLoading, error });
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="01 — User + Datafile"
      description="Static datafile, no SDK key. Decision should be available immediately with no loading state."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-01' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
