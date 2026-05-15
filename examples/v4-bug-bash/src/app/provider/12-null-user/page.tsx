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
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="12 — Null User"
      description="Provider with user={null}. Hooks remain in loading state with no decision rendered. No user context is created."
      code={CODE_SNIPPET}
    >
      <OptimizelyProvider client={client} user={null}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}

const CODE_SNIPPET = `// Provider with null user — no decision possible
<OptimizelyProvider client={client} user={null}>
  <Decision />  // uses useDecide('flag_1')
  // isLoading stays true, decision is null
</OptimizelyProvider>`;
