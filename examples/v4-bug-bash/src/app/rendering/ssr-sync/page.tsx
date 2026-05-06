import { ScenarioLayout } from '@/components/ScenarioLayout';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { SsrSyncClient } from './SsrSyncClient';

export default function Page() {
  return (
    <ScenarioLayout
      title="SSR Sync"
      description="Server component passes pre-fetched datafile to client component. Decision is available immediately during SSR — no loading state in server HTML. Disable JS in browser to verify."
    >
      <SsrSyncClient datafile={BASIC_DATAFILE} />
    </ScenarioLayout>
  );
}
