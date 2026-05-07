import { ScenarioLayout } from '@/components/ScenarioLayout';
import { SsrAsyncClient } from './SsrAsyncClient';

export default function Page() {
  return (
    <ScenarioLayout
      title="SSR Async"
      description="Client component with sdkKey only — no datafile at SSR time. Server HTML shows loading state; client hydrates and replaces with real decision after datafile is fetched."
      code={`// Client component — no datafile, fetches via sdkKey
function SsrAsyncClient() {
  const [client] = useState(() => createInstance({
    projectConfigManager: createPollingProjectConfigManager({ sdkKey }),
    eventProcessor: createBatchEventProcessor(),
    defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
  }));

  return (
    <OptimizelyProvider client={client} user={{ id: 'user-ssr-async' }}>
      <Decision />  // uses useDecide('flag_1')
    </OptimizelyProvider>
  );
}
// Server HTML shows loading → hydration fetches datafile → decision renders`}
    >
      <SsrAsyncClient />
    </ScenarioLayout>
  );
}
