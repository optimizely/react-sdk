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
  const [client] = useState(() => createOdpClient(PROJECTS.odp.sdkKey, ODP_DATAFILE, { vuid: true }));
  return (
    <ScenarioLayout
      title="useDecide (ODP + VUID)"
      description="ODP with VUID enabled and no user ID. The SDK generates a VUID for anonymous identification and uses it for the decision."
    >
      <OptimizelyProvider client={client}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
