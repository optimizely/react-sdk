'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecideAsync } from '@optimizely/react-sdk';
import { createBasicStaticClientWithUps } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { AsyncUserProfileService } from '@/lib/ups';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function Decision() {
  const { decision, isLoading, error } = useDecideAsync(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => {
    const ups = new AsyncUserProfileService(500);
    return createBasicStaticClientWithUps(BASIC_DATAFILE, ups);
  });
  return (
    <ScenarioLayout
      title="useDecideAsync (UPS)"
      description="Async decision with async UserProfileService (500ms delay). Shows loading while UPS lookup completes, then renders the decision."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-ups' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
