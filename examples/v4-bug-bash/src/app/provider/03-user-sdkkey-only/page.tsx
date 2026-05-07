'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicPollingClient } from '@/lib/clients';
import { PROJECTS, BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicPollingClient(PROJECTS.basic.sdkKey));

  return (
    <ScenarioLayout
      title="03 — SDK Key + Holdout"
      description="Polling config manager with SDK key only, no datafile. First render shows loading, then decision after datafile is fetched from CDN."
      code={CODE_SNIPPET}
    >
      <OptimizelyProvider client={client} user={{ id: 'user-03', attributes: { ho: 4 } }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}

const CODE_SNIPPET = `// Client creation — polling, no pre-loaded datafile
const client = createInstance({
  projectConfigManager: createPollingProjectConfigManager({ sdkKey }),
  eventProcessor: createBatchEventProcessor(),
  defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
});

// Provider with holdout attributes
<OptimizelyProvider client={client} user={{ id: 'user-03', attributes: { ho: 4 } }}>
  <Decision />  // uses useDecide('flag_1')
</OptimizelyProvider>`;
