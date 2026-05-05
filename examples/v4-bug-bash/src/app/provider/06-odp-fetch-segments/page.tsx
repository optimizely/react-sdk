'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createOdpClient } from '@/lib/clients';
import { ODP_DATAFILE } from '@/lib/datafiles';
import { PROJECTS, ODP_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecide(ODP_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createOdpClient(PROJECTS.odp.sdkKey, ODP_DATAFILE));

  return (
    <ScenarioLayout
      title="06 — ODP Fetch Segments"
      description="ODP client with no qualifiedSegments and skipSegments=false. First render shows loading, then decision after segments are fetched from ODP."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-06' }} skipSegments={false}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
