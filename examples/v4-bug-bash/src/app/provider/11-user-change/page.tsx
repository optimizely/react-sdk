'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const USERS = {
  normal: { id: 'user-07-a' },
  holdout: { id: 'user-12', attributes: { ho: 4 } },
} as const;

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  const [activeUser, setActiveUser] = useState<'normal' | 'holdout'>('normal');

  return (
    <ScenarioLayout
      title="11 — User Change"
      description="Single provider where the active user changes via button click. Normal user gets rollout, holdout user is held out."
      code={CODE_SNIPPET}
    >
      <div data-testid="active-user">
        <strong>Active User:</strong> {USERS[activeUser].id}
      </div>
      <div className="btn-group" style={{ margin: '1rem 0' }}>
        <button
          data-testid="btn-set-normal"
          className={`btn ${activeUser === 'normal' ? 'btn-primary' : ''}`}
          onClick={() => setActiveUser('normal')}
        >
          Normal User
        </button>
        <button
          data-testid="btn-set-holdout"
          className={`btn ${activeUser === 'holdout' ? 'btn-primary' : ''}`}
          onClick={() => setActiveUser('holdout')}
        >
          Holdout User
        </button>
      </div>
      <OptimizelyProvider client={client} user={USERS[activeUser]}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}

const CODE_SNIPPET = `// Toggle between two users via state
const [activeUser, setActiveUser] = useState('normal');

const USERS = {
  normal: { id: 'user-07-a' },
  holdout: { id: 'user-12', attributes: { ho: 4 } },
};

// Provider re-evaluates decision when user prop changes
<OptimizelyProvider client={client} user={USERS[activeUser]}>
  <Decision />  // uses useDecide('flag_1')
</OptimizelyProvider>`;
