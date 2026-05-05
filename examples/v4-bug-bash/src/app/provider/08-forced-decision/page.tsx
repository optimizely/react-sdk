'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide, useOptimizelyUserContext } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const FLAG_KEY = BASIC_FLAGS.flag1;

function ForcedDecisionControls() {
  const { decision, isLoading, error } = useDecide(FLAG_KEY);
  const { userContext } = useOptimizelyUserContext();

  const handleSetForced = () => {
    userContext?.setForcedDecision({ flagKey: FLAG_KEY }, { variationKey: 'forced_var' });
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
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));

  return (
    <ScenarioLayout
      title="08 — Forced Decisions"
      description="Interactive forced decision testing. Use buttons to set/remove forced decisions and watch the decision update reactively."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-08' }}>
        <ForcedDecisionControls />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
