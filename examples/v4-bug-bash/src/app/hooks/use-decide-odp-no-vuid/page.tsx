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
      title="useDecide (ODP, no VUID)"
      description="ODP without VUID. User ID is provided, segments are fetched from ODP. Shows loading then decision after segment fetch completes."
      code={`// Hook usage
const { decision, isLoading, error } = useDecide('flag1');

// Client — ODP without VUID
const client = createInstance({
  projectConfigManager: createPollingProjectConfigManager({ sdkKey, datafile }),
  eventProcessor: createBatchEventProcessor(),
  odpManager: createOdpManager(),
  defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
});

// User ID provided — segments fetched from ODP
<OptimizelyProvider client={client} user={{ id: 'user-hook-odp-no-vuid' }}>
  <Decision />
</OptimizelyProvider>`}
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-odp-no-vuid' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
