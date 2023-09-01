import { useDecision } from '@optimizely/react-sdk';
import React from 'react';

interface DecisionProps {
  userId: string;
  featureKey: string;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
}

export const Decision: React.FC<DecisionProps> = ({ userId, featureKey, setUserId }) => {
  const [decision, clientReady] = useDecision(featureKey, {}, { overrideUserId: userId });

  if (!clientReady) {
    return <></>;
  }

  const variationKey = decision.variationKey;
  if (variationKey === null) {
    console.log('Decision error: ', decision['reasons']);
  }

  const sortMethod = decision.variables['sort_method'];

  const matjaz = {
    enabled: 'matjaz-user-1',
    disabled: 'matjaz-user-3',
  }
  const handleClick = () => {
    setUserId(userId === matjaz.enabled ? matjaz.disabled : matjaz.enabled);
  };

  return (
    <>
      <div>
        {`Flag ${
          decision.enabled ? 'on' : 'off'
        }. User id '${userId}' saw flag variation '${variationKey}' and got products sorted by '${sortMethod}' config variable as part of flag rule '${
          decision.ruleKey
        }'`}
      </div>

      {Object.values(matjaz).includes(userId) && (
        <div>
          Some testing will need to toggle users 
          <button onClick={handleClick}>
            Toggle to {userId == matjaz.enabled ? matjaz.disabled : matjaz.enabled} user
          </button>
        </div>
      )}
    </>
  );
};

export default Decision;
