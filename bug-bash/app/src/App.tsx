import { useState } from 'react';
import { createInstance, OptimizelyProvider, useDecision } from '@optimizely/react-sdk';
import './App.css';

const sdkKey = import.meta.env.VITE_SDK_KEY;
console.log('>>> SDK_KEY', sdkKey);
const optimizelyClient = createInstance({ sdkKey });

function Pre(props) {
  return <pre style={{ margin: 0 }}>{props.children}</pre>;
}

function isClientValid() {
  return optimizelyClient.getOptimizelyConfig() !== null;
}

const userIds: string[] = [];
while (userIds.length < 10) {
  userIds.push((Math.floor(Math.random() * 999999) + 100000).toString());
}

function App() {
  const [hasOnFlag, setHasOnFlag] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isClientReady, setIsClientReady] = useState(null);

  optimizelyClient.onReady().then(() => {
    setIsDone(true);
    isClientValid() && setIsClientReady(true);
  });

  let projectId = '{project_id}';
  if (isClientValid()) {
    const datafile = JSON.parse(optimizelyClient.getOptimizelyConfig().getDatafile());
    projectId = datafile.projectId;
  }

  return (
    <OptimizelyProvider optimizely={optimizelyClient} user={{ id: 'default_user' }}>
      <pre>Welcome to our Quickstart Guide!</pre>
      {isClientReady && (
        <>
          {userIds.map(userId => (
            <Decision key={userId} userId={userId} setHasOnFlag={setHasOnFlag} />
          ))}
          <br />
          {!hasOnFlag && <FlagsOffMessage projectId={projectId} />}
        </>
      )}
      {isDone && !isClientReady && (
        <Pre>
          Optimizely client invalid. Verify in Settings - Environments that you used the primary environment's SDK key
        </Pre>
      )}
    </OptimizelyProvider>
  );
}

function FlagsOffMessage({ projectId }) {
  const navLink = `https://app.optimizely.com/v2/projects/${projectId}/settings/implementation`;
  return (
    <div>
      <Pre>Flag was off for everyone. Some reasons could include:</Pre>
      <Pre>1. Your sample size of visitors was too small. Rerun, or increase the iterations in the FOR loop</Pre>
      <Pre>
        2. By default you have 2 keys for 2 project environments (dev/prod). Verify in Settings - Environments that you
        used the right key for the environment where your flag is toggled to ON.
      </Pre>
      <Pre>
        Check your key at <a href={navLink}>{navLink}</a>
      </Pre>
      <br />
    </div>
  );
}

function Decision({ userId, setHasOnFlag }) {
  const [decision, clientReady] = useDecision('product_sort', {}, { overrideUserId: userId });

  if (!clientReady) {
    return '';
  }

  const variationKey = decision.variationKey;

  if (variationKey === null) {
    console.log(' decision error: ', decision['reasons']);
  }

  if (decision.enabled) {
    setTimeout(() => setHasOnFlag(true));
  }

  const sortMethod = decision.variables['sort_method'];

  return (
    <Pre>
      {`\nFlag ${
        decision.enabled ? 'on' : 'off'
      }. User number ${userId} saw flag variation: ${variationKey} and got products sorted by: ${sortMethod} config variable as part of flag rule: ${
        decision.ruleKey
      }`}
    </Pre>
  );
}

export default App;
