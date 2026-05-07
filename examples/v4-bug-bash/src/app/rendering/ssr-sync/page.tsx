import { ScenarioLayout } from '@/components/ScenarioLayout';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { SsrSyncClient } from './SsrSyncClient';

export default function Page() {
  return (
    <ScenarioLayout
      title="SSR Sync"
      description="Server component passes pre-fetched datafile to client component. Decision is available immediately during SSR — no loading state in server HTML. Disable JS in browser to verify."
      code={`// Server component passes datafile to client component
export default function Page() {
  return <SsrSyncClient datafile={BASIC_DATAFILE} />;
}

// Client component — decision available immediately
function SsrSyncClient({ datafile }) {
  const [client] = useState(() => createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile }),
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
  }));

  return (
    <OptimizelyProvider client={client} user={{ id: 'user-ssr-sync' }}>
      <Decision />  // uses useDecide('flag_1')
    </OptimizelyProvider>
  );
}`}
    >
      <SsrSyncClient datafile={BASIC_DATAFILE} />
    </ScenarioLayout>
  );
}
