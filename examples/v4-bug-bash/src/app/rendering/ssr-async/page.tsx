import { ScenarioLayout } from '@/components/ScenarioLayout';
import { SsrAsyncClient } from './SsrAsyncClient';

export default function Page() {
  return (
    <ScenarioLayout
      title="SSR Async"
      description="Client component with sdkKey only — no datafile at SSR time. Server HTML shows loading state; client hydrates and replaces with real decision after datafile is fetched."
    >
      <SsrAsyncClient />
    </ScenarioLayout>
  );
}
