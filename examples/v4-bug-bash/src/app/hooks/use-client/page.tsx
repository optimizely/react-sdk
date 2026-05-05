'use client';

import { useState } from 'react';
import { OptimizelyProvider, useOptimizelyClient } from '@optimizely/react-sdk';
import { createBasicStaticClient } from '@/lib/clients';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { ScenarioLayout } from '@/components/ScenarioLayout';

function ClientInfo() {
  const client = useOptimizelyClient();
  const config = client.getOptimizelyConfig();

  return (
    <div>
      <div data-testid="client-available">
        <strong>Client available:</strong> {String(!!client)}
      </div>
      <div data-testid="config-available">
        <strong>Config available:</strong> {String(!!config)}
      </div>
      {config && (
        <>
          <div data-testid="config-revision">
            <strong>Revision:</strong> {config.revision}
          </div>
          <div data-testid="config-sdk-key">
            <strong>SDK Key:</strong> {config.sdkKey || '(none — static datafile)'}
          </div>
          <div data-testid="config-environments">
            <strong>Environment Key:</strong> {config.environmentKey || '(none)'}
          </div>
          <div data-testid="config-features">
            <strong>Features:</strong>
            <pre>{JSON.stringify(Object.keys(config.featuresMap), null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
}

export default function Page() {
  const [client] = useState(() => createBasicStaticClient(BASIC_DATAFILE));
  return (
    <ScenarioLayout
      title="useOptimizelyClient"
      description="Returns the Optimizely Client instance from the nearest provider. Displays getOptimizelyConfig() result including revision, SDK key, and feature map."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-hook-client' }}>
        <ClientInfo />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
