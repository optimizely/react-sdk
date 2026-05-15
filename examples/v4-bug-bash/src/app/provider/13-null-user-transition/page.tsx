'use client';

import { useState } from 'react';
import { OptimizelyProvider, useDecide } from '@optimizely/react-sdk';
import { createBasicPollingClient } from '@/lib/clients';
import { PROJECTS, BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const USERS = {
  null: null,
  normal: { id: 'user-07-a' },
  holdout: { id: 'user-12', attributes: { ho: 4 } },
} as const;

type UserKey = keyof typeof USERS;

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  const [client] = useState(() => createBasicPollingClient(PROJECTS.basic.sdkKey));
  const [activeUser, setActiveUser] = useState<UserKey>('null');

  return (
    <ScenarioLayout
      title="13 — Null User Transition (SDK Key Only)"
      description="Polling config manager with SDK key only (no pre-loaded datafile). Provider starts with user={null} (loading state). Buttons switch between null, normal user, and holdout user to test transitions with async datafile fetch."
      code={CODE_SNIPPET}
    >
      <div data-testid="active-user">
        <strong>Active User:</strong> {activeUser === 'null' ? 'null' : USERS[activeUser]!.id}
      </div>
      <div className="btn-group" style={{ margin: '1rem 0' }}>
        <button
          data-testid="btn-set-null"
          className={`btn ${activeUser === 'null' ? 'btn-primary' : ''}`}
          onClick={() => setActiveUser('null')}
        >
          Null User
        </button>
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

const CODE_SNIPPET = `// Client — polling, no pre-loaded datafile
const client = createInstance({
  projectConfigManager: createPollingProjectConfigManager({ sdkKey }),
  eventProcessor: createBatchEventProcessor(),
  defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
});

// Three-state user toggle: null, normal, holdout
const [activeUser, setActiveUser] = useState('null');

const USERS = {
  null: null,
  normal: { id: 'user-07-a' },
  holdout: { id: 'user-12', attributes: { ho: 4 } },
};

// Provider handles null -> valid and valid -> null transitions
<OptimizelyProvider client={client} user={USERS[activeUser]}>
  <Decision />  // uses useDecide('flag_1')
</OptimizelyProvider>`;
