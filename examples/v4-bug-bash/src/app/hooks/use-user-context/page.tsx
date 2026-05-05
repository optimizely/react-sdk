'use client';

import { useState } from 'react';
import { OptimizelyProvider, useOptimizelyUserContext } from '@optimizely/react-sdk';
import { createBasicPollingClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { PROJECTS, BASIC_EVENTS } from '@/lib/config';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function UserContextInfo() {
  const { userContext, isLoading, error } = useOptimizelyUserContext();
  const [trackStatus, setTrackStatus] = useState<string>('Not tracked yet');

  const handleTrack = () => {
    if (!userContext) return;
    userContext.trackEvent(BASIC_EVENTS.event1, { value: 42 });
    setTrackStatus(`Tracked "${BASIC_EVENTS.event1}" at ${new Date().toLocaleTimeString()}`);
  };

  if (isLoading) {
    return <div data-testid="user-context-loading">Loading user context...</div>;
  }

  if (error) {
    return <div data-testid="user-context-error">Error: {error.message}</div>;
  }

  return (
    <div>
      <div data-testid="user-context-available">
        <strong>User Context available:</strong> {String(!!userContext)}
      </div>
      <div data-testid="user-context-user-id">
        <strong>User ID:</strong> {userContext?.getUserId()}
      </div>
      <div data-testid="user-context-attributes">
        <strong>Attributes:</strong>
        <pre>{JSON.stringify(userContext?.getAttributes(), null, 2)}</pre>
      </div>
      <div>
        <button data-testid="btn-track-event" className="btn btn-primary" onClick={handleTrack}>
          Track Event
        </button>
        <div data-testid="track-status" style={{ marginTop: '0.5rem' }}>
          {trackStatus}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [client] = useState(() => createBasicPollingClient(PROJECTS.basic.sdkKey, BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="useOptimizelyUserContext"
      description="Returns the current OptimizelyUserContext. Displays user ID and attributes. Button calls trackEvent to verify event dispatch."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-context', attributes: { plan: 'premium' } }}>
        <UserContextInfo />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
