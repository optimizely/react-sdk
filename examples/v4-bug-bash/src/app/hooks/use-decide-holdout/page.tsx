'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag2);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="useDecide (Holdout)"
      description="Tests useDecide with a flag that is part of a holdout group. The decision should reflect holdout exclusion when applicable."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-holdout' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
