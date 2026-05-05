'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createOdpClient } from '@/lib/clients';
import { ODP_DATAFILE } from '@/lib/datafiles';
import { PROJECTS, ODP_FLAGS, ODP_SEGMENTS } from '@/lib/config';
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
      title="05 — ODP Qualified Segments"
      description="ODP client with pre-provided qualifiedSegments. Decision should be available immediately since segments are pre-provided."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-05' }} qualifiedSegments={[...ODP_SEGMENTS]}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
