'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide, useOptimizelyUserContext } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { ODP_DATAFILE } from '@/lib/datafiles';
import { ODP_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const FLAG_KEY = ODP_FLAGS.flag1;
const FORCED_VARIATION = 'variation_a';

function ForcedDecisionControls() {
  const { decision, isLoading, error } = useDecide(FLAG_KEY);
  const { userContext } = useOptimizelyUserContext();

  const handleSetForced = () => {
    userContext?.setForcedDecision({ flagKey: FLAG_KEY }, { variationKey: FORCED_VARIATION });
  };

  const handleRemoveForced = () => {
    userContext?.removeForcedDecision({ flagKey: FLAG_KEY });
  };

  const handleRemoveAll = () => {
    userContext?.removeAllForcedDecisions();
  };

  return (
    <>
      <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />
      <div className="btn-group">
        <button data-testid="btn-set-forced" className="btn btn-primary" onClick={handleSetForced}>
          Set Forced
        </button>
        <button data-testid="btn-remove-forced" className="btn" onClick={handleRemoveForced}>
          Remove Forced
        </button>
        <button data-testid="btn-remove-all" className="btn" onClick={handleRemoveAll}>
          Remove All
        </button>
      </div>
    </>
  );
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(ODP_DATAFILE));

  return (
    <ScenarioLayout
      title="08 — Forced Decisions"
      description="Interactive forced decision testing. Uses ODP flag1 (has variation_a and variation_b). Buttons set/remove forced decisions reactively."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-08' }}>
        <ForcedDecisionControls />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
