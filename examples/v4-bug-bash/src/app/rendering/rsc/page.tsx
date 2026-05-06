import { createInstance, createStaticProjectConfigManager, OptimizelyDecideOption } from '@optimizely/react-sdk';
import { BASIC_DATAFILE } from '@/lib/datafiles';
import { BASIC_FLAGS } from '@/lib/config';
import { ScenarioLayout } from '@/components/ScenarioLayout';

export default async function Page() {
  const client = createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile: BASIC_DATAFILE }),
    disposable: true,
    defaultDecideOptions: [OptimizelyDecideOption.DISABLE_DECISION_EVENT, OptimizelyDecideOption.INCLUDE_REASONS],
  });

  await client.onReady();

  const userContext = client.createUserContext('user-rsc');
  const decision = userContext.decide(BASIC_FLAGS.flag1);

  await client.close();

  return (
    <ScenarioLayout
      title="React Server Component"
      description="Pure async server component — decision is made entirely on the server. No client-side React JS needed for this component. Imports resolve via the react-server export condition."
    >
      <div>
        <div data-testid="decision-enabled">
          <strong>Enabled:</strong> {String(decision.enabled)}
        </div>
        <div data-testid="decision-variation-key">
          <strong>Variation Key:</strong> {decision.variationKey ?? 'null'}
        </div>
        <div data-testid="decision-flag-key">
          <strong>Flag Key:</strong> {decision.flagKey}
        </div>
        <div data-testid="decision-rule-key">
          <strong>Rule Key:</strong> {decision.ruleKey ?? 'null'}
        </div>
        <div data-testid="decision-variables">
          <strong>Variables:</strong>
          <pre>{JSON.stringify(decision.variables, null, 2)}</pre>
        </div>
        <div data-testid="decision-reasons">
          <strong>Reasons:</strong>
          <ul>
            {decision.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </ScenarioLayout>
  );
}
