import { useDecision } from '@optimizely/react-sdk';
import React from 'react';

interface DecisionProps {
  userId: string;
  featureKey: string;
}

export const Decision: React.FC<DecisionProps> = ({ userId, featureKey }) => {
  const [decision, clientReady] = useDecision(featureKey, {}, { overrideUserId: userId });

  if (!clientReady) {
    return <></>;
  }

  const variationKey = decision.variationKey;
  if (variationKey === null) {
    console.log('Decision error: ', decision['reasons']);
  }

  const sortMethod = decision.variables['sort_method'];

  return (
    <p>
      {`Flag ${
        decision.enabled ? 'on' : 'off'
      }. User number ${userId} saw flag variation: ${variationKey} and got products sorted by: ${sortMethod} config variable as part of flag rule: ${
        decision.ruleKey
      }`}
    </p>
  );
};

export default Decision;