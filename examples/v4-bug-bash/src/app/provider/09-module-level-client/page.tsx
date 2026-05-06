'use client';

import {
  OptimizelyProvider,
  useDecide,
  createInstance,
  createStaticProjectConfigManager,
  OptimizelyDecideOption,
} from '@optimizely/react-sdk';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { DecisionDisplay } from '@/components/DecisionDisplay';
import { ScenarioLayout } from '@/components/ScenarioLayout';

const client = createInstance({
  projectConfigManager: createStaticProjectConfigManager({ datafile: BASIC_DATAFILE }),
  defaultDecideOptions: [OptimizelyDecideOption.INCLUDE_REASONS],
});

function Decision() {
  const { decision, isLoading, error } = useDecide(BASIC_FLAGS.flag1);
  return <DecisionDisplay prefix="decision" decision={decision} isLoading={isLoading} error={error} />;
}

export default function Page() {
  return (
    <ScenarioLayout
      title="09 — Module-Level Client"
      description="Client created at module scope (top-level const). Verifies that module-scoped clients work with the provider and persist across navigations."
    >
      <OptimizelyProvider client={client} user={{ id: 'user-09' }}>
        <Decision />
      </OptimizelyProvider>
    </ScenarioLayout>
  );
}
