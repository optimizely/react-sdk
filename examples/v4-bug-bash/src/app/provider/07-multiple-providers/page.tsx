'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision({ prefix }: { prefix: string }) {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix={prefix} decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));

  return (
    <ScenarioLayout
      title="07 — Multiple Providers"
      description="Two OptimizelyProvider wrappers sharing the same client. Provider A gets normal rollout, Provider B is held out."
      code={`// Same client shared by both providers
const client = createInstance({
  projectConfigManager: createStaticProjectConfigManager({ datafile }),
  defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
});

// Provider A — normal user gets rollout
<OptimizelyProvider client={client} user={{ id: 'user-07-a' }}>
  <Decision />  // useDecide('flag_1') → var_1, enabled
</OptimizelyProvider>

// Provider B — holdout user is held out
<OptimizelyProvider client={client} user={{ id: 'user-12', attributes: { ho: 4 } }}>
  <Decision />  // useDecide('flag_1') → off, disabled
</OptimizelyProvider>`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <h3>Provider A (normal user)</h3>
          <OptimizelyProvider client={client} user={{ id: 'user-07-a' }}>
            <Decision prefix="decision-a" />
          </OptimizelyProvider>
        </div>
        <div>
          <h3>Provider B (holdout user)</h3>
          <OptimizelyProvider client={client} user={{ id: 'user-12', attributes: { ho: 4 } }}>
            <Decision prefix="decision-b" />
          </OptimizelyProvider>
        </div>
      </div>
    </ScenarioLayout>
  );
}
