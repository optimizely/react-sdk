/**
 * Copyright 2019-2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as optimizely from '@optimizely/optimizely-sdk';
import * as logging from '@optimizely/js-sdk-logging';

import { OptimizelyDecision, UserInfo, createFailedDecision, areUsersEqual } from './utils';
import { notifier } from './notifier';

const logger = logging.getLogger('ReactSDK');

export type VariableValuesObject = {
  [key: string]: any;
};

type DisposeFn = () => void;

type OnUserUpdateHandler = (userInfo: UserInfo) => void;

type OnForcedVariationsUpdateHandler = () => void;

export type OnReadyResult = {
  success: boolean;
  reason?: string;
  dataReadyPromise?: Promise<any>;
};

const REACT_SDK_CLIENT_ENGINE = 'react-sdk';
const REACT_SDK_CLIENT_VERSION = '2.8.0';

export interface ReactSDKClient extends Omit<optimizely.Client, 'createUserContext'> {
  user: UserInfo;

  onReady(opts?: { timeout?: number }): Promise<any>;
  setUser(userInfo: UserInfo): void;
  onUserUpdate(handler: OnUserUpdateHandler): DisposeFn;
  isReady(): boolean;
  getIsReadyPromiseFulfilled(): boolean;
  getIsUsingSdkKey(): boolean;

  activate(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): string | null;

  getVariation(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): string | null;

  getFeatureVariables(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): VariableValuesObject;

  getFeatureVariableString(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): string | null;

  getFeatureVariableInteger(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): number | null;

  getFeatureVariableBoolean(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): boolean | null;

  getFeatureVariableDouble(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): number | null;

  getFeatureVariableJSON(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): unknown;

  getFeatureVariable(
    featureKey: string,
    variableKey: string,
    overrideUserId: string,
    overrideAttributes?: optimizely.UserAttributes
  ): unknown;

  getAllFeatureVariables(
    featureKey: string,
    overrideUserId: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [variableKey: string]: unknown } | null;

  isFeatureEnabled(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): boolean;

  getEnabledFeatures(overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): Array<string>;

  getOptimizelyConfig(): optimizely.OptimizelyConfig | null;

  track(
    eventKey: string,
    overrideUserId?: string | optimizely.EventTags,
    overrideAttributes?: optimizely.UserAttributes,
    eventTags?: optimizely.EventTags
  ): void;

  setForcedVariation(experiment: string, overrideUserIdOrVariationKey: string, variationKey?: string | null): boolean;

  getForcedVariation(experiment: string, overrideUserId?: string): string | null;

  onForcedVariationsUpdate(handler: OnForcedVariationsUpdateHandler): DisposeFn;

  decide(
    key: string,
    options?: optimizely.OptimizelyDecideOption[],
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): OptimizelyDecision;

  decideAll(
    options?: optimizely.OptimizelyDecideOption[],
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [key: string]: OptimizelyDecision };

  decideForKeys(
    keys: string[],
    options?: optimizely.OptimizelyDecideOption[],
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [key: string]: OptimizelyDecision };

  setForcedDecision(
    decisionContext: optimizely.OptimizelyDecisionContext,
    decision: optimizely.OptimizelyForcedDecision
  ): void;

  removeAllForcedDecisions(): boolean;

  removeForcedDecision(decisionContext: optimizely.OptimizelyDecisionContext): boolean;

  notificationCenter: optimizely.NotificationCenter;

  getForcedDecision(decisionContext: optimizely.OptimizelyDecisionContext): optimizely.OptimizelyForcedDecision | null;
}

export const DEFAULT_ON_READY_TIMEOUT = 5000;

class OptimizelyReactSDKClient implements ReactSDKClient {
  public initialConfig: optimizely.Config;
  public user: UserInfo = {
    id: null,
    attributes: {},
  };
  private userContext: optimizely.OptimizelyUserContext | null = null;
  private userPromiseResolver: (user: UserInfo) => void;
  private userPromise: Promise<OnReadyResult>;
  private isUserPromiseResolved = false;
  private onUserUpdateHandlers: OnUserUpdateHandler[] = [];
  private onForcedVariationsUpdateHandlers: OnForcedVariationsUpdateHandler[] = [];
  private forcedDecisionFlagKeys: Set<string> = new Set<string>();

  // Is the javascript SDK instance ready.
  private isClientReady: boolean = false;

  // We need to add autoupdate listener to the hooks after the instance became fully ready to avoid redundant updates to hooks
  private isReadyPromiseFulfilled: boolean = false;

  // Its usually true from the beginning when user is provided as an object in the `OptimizelyProvider`
  // This becomes more significant when a promise is provided instead.
  private isUserReady: boolean = false;

  private isUsingSdkKey: boolean = false;

  private readonly _client: optimizely.Client;

  // promise keeping track of async requests for initializing client instance
  private dataReadyPromise: Promise<OnReadyResult>;

  /**
   * Creates an instance of OptimizelyReactSDKClient.
   * @param {optimizely.Config} [config={}]
   */
  constructor(config: optimizely.Config) {
    this.initialConfig = config;

    this.userPromiseResolver = () => {};

    const configWithClientInfo = {
      ...config,
      clientEngine: REACT_SDK_CLIENT_ENGINE,
      clientVersion: REACT_SDK_CLIENT_VERSION,
    };
    this._client = optimizely.createInstance(configWithClientInfo);

    this.isClientReady = !!configWithClientInfo.datafile;
    this.isUsingSdkKey = !!configWithClientInfo.sdkKey;

    this.userPromise = new Promise(resolve => {
      this.userPromiseResolver = resolve;
    }).then(() => {
      this.isUserReady = true;
      return { success: true };
    });

    this._client.onReady().then(() => {
      this.isClientReady = true;
    });

    this.dataReadyPromise = Promise.all([this.userPromise, this._client.onReady()]).then(() => {
      // Client and user can become ready synchronously and/or asynchronously. This flag specifically indicates that they became ready asynchronously.
      this.isReadyPromiseFulfilled = true;
      return {
        success: true,
        reason: 'datafile and user resolved',
      };
    });
  }

  getIsReadyPromiseFulfilled(): boolean {
    return this.isReadyPromiseFulfilled;
  }

  getIsUsingSdkKey(): boolean {
    return this.isUsingSdkKey;
  }

  onReady(config: { timeout?: number } = {}): Promise<OnReadyResult> {
    let timeoutId: number | undefined;
    let timeout: number = DEFAULT_ON_READY_TIMEOUT;
    if (config && config.timeout !== undefined) {
      timeout = config.timeout;
    }

    const timeoutPromise = new Promise<OnReadyResult>(resolve => {
      timeoutId = setTimeout(() => {
        resolve({
          success: false,
          reason:
            'failed to initialize onReady before timeout, either the datafile or user info was not set before the timeout',
          dataReadyPromise: this.dataReadyPromise,
        });
      }, timeout) as any;
    });

    return Promise.race([this.dataReadyPromise, timeoutPromise]).then(res => {
      clearTimeout(timeoutId);
      return res;
    });
  }

  getUserContextInstance(userInfo: UserInfo): optimizely.OptimizelyUserContext | null {
    let userContext: optimizely.OptimizelyUserContext | null = null;

    if (this.userContext) {
      if (areUsersEqual(userInfo, this.user)) {
        return this.userContext;
      }

      if (userInfo.id) {
        userContext = this._client.createUserContext(userInfo.id, userInfo.attributes);
        return userContext;
      }

      return null;
    }

    if (userInfo.id) {
      this.userContext = this._client.createUserContext(userInfo.id, userInfo.attributes);
      return this.userContext;
    }

    return null;
  }

  setUser(userInfo: UserInfo): void {
    // TODO add check for valid user
    if (userInfo.id) {
      const userContext = this._client.createUserContext(userInfo.id, userInfo.attributes);

      this.user.id = userInfo.id;
      this.isUserReady = true;
      this.userContext = userContext;
    }

    if (userInfo.attributes) {
      this.user.attributes = userInfo.attributes;
    }

    if (!this.isUserPromiseResolved) {
      this.userPromiseResolver(this.user);
      this.isUserPromiseResolved = true;
    }

    this.onUserUpdateHandlers.forEach(handler => handler(this.user));
  }

  onUserUpdate(handler: OnUserUpdateHandler): DisposeFn {
    this.onUserUpdateHandlers.push(handler);

    return () => {
      const ind = this.onUserUpdateHandlers.indexOf(handler);
      if (ind > -1) {
        this.onUserUpdateHandlers.splice(ind, 1);
      }
    };
  }

  /**
   * Register a handler to be called whenever setForcedVariation is called on
   * this client. Returns a function that un-registers the handler when called.
   * @param {OnForcedVariationsUpdateHandler} handler
   * @returns {DisposeFn}
   */
  onForcedVariationsUpdate(handler: OnForcedVariationsUpdateHandler): DisposeFn {
    this.onForcedVariationsUpdateHandlers.push(handler);

    return (): void => {
      const ind = this.onForcedVariationsUpdateHandlers.indexOf(handler);
      if (ind > -1) {
        this.onForcedVariationsUpdateHandlers.splice(ind, 1);
      }
    };
  }

  isReady(): boolean {
    // React SDK Instance only becomes ready when both JS SDK client and the user info is ready.
    return this.isUserReady && this.isClientReady;
  }

  /**
   * Buckets visitor and sends impression event to Optimizely
   * @param {string} experimentKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public activate(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      logger.info('Not activating experiment "%s" because userId is not set', experimentKey);
      return null;
    }
    return this._client.activate(experimentKey, user.id, user.attributes);
  }

  public decide(
    key: string,
    options: optimizely.OptimizelyDecideOption[] = [],
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): OptimizelyDecision {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      logger.info('Not Evaluating feature "%s" because userId is not set', key);
      return createFailedDecision(key, `Not Evaluating flag ${key} because userId is not set`, user);
    }

    const optlyUserContext = this.getUserContextInstance(user);
    if (optlyUserContext) {
      return {
        ...optlyUserContext.decide(key, options),
        userContext: {
          id: user.id,
          attributes: user.attributes,
        },
      };
    }
    return createFailedDecision(key, `Not Evaluating flag ${key} because user id or attributes are not valid`, user);
  }

  public decideForKeys(
    keys: string[],
    options: optimizely.OptimizelyDecideOption[] = [],
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [key: string]: OptimizelyDecision } {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      logger.info('Not Evaluating features because userId is not set');
      return {};
    }

    const optlyUserContext = this.getUserContextInstance(user);
    if (optlyUserContext) {
      return Object.entries(optlyUserContext.decideForKeys(keys, options)).reduce(
        (decisions: { [key: string]: OptimizelyDecision }, [key, decision]) => {
          decisions[key] = {
            ...decision,
            userContext: {
              id: user.id || '',
              attributes: user.attributes,
            },
          };
          return decisions;
        },
        {}
      );
    }
    return {};
  }

  public decideAll(
    options: optimizely.OptimizelyDecideOption[] = [],
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [key: string]: OptimizelyDecision } {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      logger.info('Not Evaluating features because userId is not set');
      return {};
    }

    const optlyUserContext = this.getUserContextInstance(user);
    if (optlyUserContext) {
      return Object.entries(optlyUserContext.decideAll(options)).reduce(
        (decisions: { [key: string]: OptimizelyDecision }, [key, decision]) => {
          decisions[key] = {
            ...decision,
            userContext: {
              id: user.id || '',
              attributes: user.attributes,
            },
          };
          return decisions;
        },
        {}
      );
    }
    return {};
  }

  /**
   * Gets variation where visitor will be bucketed
   * @param {string} experimentKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getVariation(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      logger.info('getVariation returned null for experiment "%s" because userId is not set', experimentKey);
      return null;
    }
    return this._client.getVariation(experimentKey, user.id, user.attributes);
  }

  /**
   * Sends conversion event to Optimizely
   * @param {string} eventKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @param {optimizely.EventTags} [eventTags]
   * @memberof OptimizelyReactSDKClient
   */
  public track(
    eventKey: string,
    overrideUserId?: string | optimizely.EventTags,
    overrideAttributes?: optimizely.UserAttributes,
    eventTags?: optimizely.EventTags
  ): void {
    if (typeof overrideUserId !== 'undefined' && typeof overrideUserId !== 'string') {
      eventTags = overrideUserId;
      overrideUserId = undefined;
      overrideAttributes = undefined;
    }
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('track for event "%s" not being sent because userId is not set', eventKey);
      return;
    }

    return this._client.track(eventKey, user.id, user.attributes, eventTags);
  }

  /**
   * Sets the forced decision for specified optimizely decision context.
   * @param {optimizely.OptimizelyDecisionContext} decisionContext
   * @param {optimizely.OptimizelyForcedDecision} forcedDecision
   * @memberof OptimizelyReactSDKClient
   */
  public setForcedDecision(
    decisionContext: optimizely.OptimizelyDecisionContext,
    decision: optimizely.OptimizelyForcedDecision
  ): void {
    if (!this.userContext) {
      logger.info("Can't set a forced decision because the user context has not been set yet");
      return;
    }

    const isSuccess = this.userContext.setForcedDecision(decisionContext, decision);

    if (isSuccess) {
      this.forcedDecisionFlagKeys.add(decisionContext.flagKey);
      notifier.notify(decisionContext.flagKey);
    }
  }

  /**
   * Returns the forced decision for specified optimizely decision context.
   * @param {optimizely.OptimizelyDecisionContext} decisionContext
   * @return {(optimizely.OptimizelyForcedDecision | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getForcedDecision(
    decisionContext: optimizely.OptimizelyDecisionContext
  ): optimizely.OptimizelyForcedDecision | null {
    if (!this.userContext) {
      logger.info("Can't get a forced decision because the user context has not been set yet");
      return null;
    }
    return this.userContext.getForcedDecision(decisionContext);
  }

  /**
   * Removes the forced decision for specified optimizely decision context.
   * @param {optimizely.OptimizelyDecisionContext} decisionContext
   * @return {boolean}
   * @memberof OptimizelyReactSDKClient
   */
  public removeForcedDecision(decisionContext: optimizely.OptimizelyDecisionContext): boolean {
    if (!this.userContext) {
      logger.info("Can't remove forced decisions because the user context has not been set yet");
      return false;
    }

    const isSuccess = this.userContext.removeForcedDecision(decisionContext);

    if (isSuccess) {
      this.forcedDecisionFlagKeys.delete(decisionContext.flagKey);
      notifier.notify(decisionContext.flagKey);
    }

    return isSuccess;
  }

  /**
   * Removes all the forced decision.
   * @return {boolean}
   * @memberof OptimizelyReactSDKClient
   */
  public removeAllForcedDecisions(): boolean {
    if (!this.userContext) {
      logger.info("Can't remove a forced decision because the user context has not been set yet");
      return false;
    }

    const isSuccess = this.userContext.removeAllForcedDecisions();

    if (isSuccess) {
      this.forcedDecisionFlagKeys.forEach(flagKey => notifier.notify(flagKey));
      this.forcedDecisionFlagKeys.clear();
    }

    return isSuccess;
  }

  /**
   * Returns true if the feature is enabled for the given user
   * @param {string} feature
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {boolean}
   * @memberof OptimizelyReactSDKClient
   */
  public isFeatureEnabled(
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): boolean {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      logger.info('isFeatureEnabled returning false for feature "%s" because userId is not set', feature);
      return false;
    }
    return this._client.isFeatureEnabled(feature, user.id, user.attributes);
  }

  /**
   * @deprecated since 2.1.0
   * getAllFeatureVariables is added in JavaScript SDK which is similarly returning all the feature variables, but
   * it sends only single notification of type "all-feature-variables" instead of sending for each variable.
   * As getFeatureVariables was added when this functionality wasn't provided by JavaScript SDK, so there is no
   * need of it now and it would be removed in next major release
   *
   * Get all variables for a feature, regardless of the feature being enabled/disabled
   * @param {string} featureKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {VariableValuesObject}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariables(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): VariableValuesObject {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    const userId = user.id;
    if (userId === null) {
      logger.info('getFeatureVariables returning `{}` for feature "%s" because userId is not set', featureKey);
      return {};
    }
    const userAttributes = user.attributes;
    const variableObj: VariableValuesObject = {};
    const optlyConfig = this._client.getOptimizelyConfig();
    if (!optlyConfig) {
      return {};
    }
    const feature = optlyConfig.featuresMap[featureKey];
    if (!feature) {
      return {};
    }
    Object.keys(feature.variablesMap).forEach(key => {
      const variable = feature.variablesMap[key];
      variableObj[variable.key] = this._client.getFeatureVariable(featureKey, variable.key, userId, userAttributes);
    });

    return variableObj;
  }

  /**
   * Returns value for the given string variable attached to the given feature
   * flag
   * @param {string} feature
   * @param {string} variable
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariableString(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return null;
    }
    return this._client.getFeatureVariableString(feature, variable, user.id, user.attributes);
  }

  /**
   * Returns value for the given boolean variable attached to the given feature
   * flag
   * @param {string} feature
   * @param {string} variable
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariableBoolean(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): boolean | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return null;
    }
    return this._client.getFeatureVariableBoolean(feature, variable, user.id, user.attributes);
  }

  /**
   * Returns value for the given integer variable attached to the given feature
   * flag
   * @param {string} feature
   * @param {string} variable
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariableInteger(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): number | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return null;
    }
    return this._client.getFeatureVariableInteger(feature, variable, user.id, user.attributes);
  }

  /**
   * Returns value for the given double variable attached to the given feature
   * flag
   * @param {string} feature
   * @param {string} variable
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariableDouble(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): number | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return null;
    }
    return this._client.getFeatureVariableDouble(feature, variable, user.id, user.attributes);
  }

  /**
   * Returns value for the given json variable attached to the given feature
   * flag
   * @param {string} feature
   * @param {string} variable
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(unknown | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariableJSON(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): unknown {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return null;
    }
    return this._client.getFeatureVariableJSON(feature, variable, user.id, user.attributes);
  }

  /**
   * Returns dynamically-typed value of the variable attached to the given
   * feature flag. Returns null if the feature key or variable key is invalid.
   * @param {string} featureKey
   * @param {string} variableKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(unknown | null)}
   * @memberof OptimizelyReactSDKClient
   */
  getFeatureVariable(
    featureKey: string,
    variableKey: string,
    overrideUserId: string,
    overrideAttributes?: optimizely.UserAttributes
  ): unknown {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return null;
    }
    return this._client.getFeatureVariable(featureKey, variableKey, user.id, user.attributes);
  }

  /**
   * Returns values for all the variables attached to the given feature flag
   * @param {string} featureKey
   * @param {string} overrideUserId
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {({ [variableKey: string]: unknown } | null)}
   * @memberof OptimizelyReactSDKClient
   */
  getAllFeatureVariables(
    featureKey: string,
    overrideUserId: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [variableKey: string]: unknown } | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return {};
    }
    return this._client.getAllFeatureVariables(featureKey, user.id, user.attributes);
  }

  /**
   * Get an array of all enabled features
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideUserId]
   * @returns {Array<string>}
   * @memberof OptimizelyReactSDKClient
   */
  public getEnabledFeatures(overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): Array<string> {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes);
    if (user.id === null) {
      return [];
    }
    return this._client.getEnabledFeatures(user.id, user.attributes);
  }

  /**
   * Gets the forced variation for a given user and experiment
   * @param {string} experiment
   * @param {string} [overrideUserId]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getForcedVariation(experiment: string, overrideUserId?: string): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId);
    if (user.id === null) {
      return null;
    }
    return this._client.getForcedVariation(experiment, user.id);
  }

  /**
   * Force a user into a variation for a given experiment
   * @param {string} experiment
   * @param {string} overrideUserIdOrVariationKey
   * @param {string} [variationKey]
   * @returns {boolean}
   * @memberof OptimizelyReactSDKClient
   */
  public setForcedVariation(
    experiment: string,
    overrideUserIdOrVariationKey: string,
    variationKey?: string | null
  ): boolean {
    let finalUserId: string | null = null;
    let finalVariationKey: string | null = null;
    if (arguments.length === 2) {
      finalVariationKey = overrideUserIdOrVariationKey;
      finalUserId = this.getUserContextWithOverrides().id;
    } else if (arguments.length === 3) {
      finalUserId = this.getUserContextWithOverrides(overrideUserIdOrVariationKey).id;
      if (variationKey === undefined) {
        // can't have undefined if supplying all 3 arguments
        return false;
      }
      finalVariationKey = variationKey;
    }

    if (finalUserId === null) {
      return false;
    }
    const result = this._client.setForcedVariation(experiment, finalUserId, finalVariationKey);
    this.onForcedVariationsUpdateHandlers.forEach(handler => handler());
    return result;
  }

  /**
   *  Returns OptimizelyConfig object containing experiments and features data
   *  @returns {optimizely.OptimizelyConfig | null} optimizely config
   */
  public getOptimizelyConfig(): optimizely.OptimizelyConfig | null {
    return this._client.getOptimizelyConfig();
  }

  /**
   * Cleanup method for killing an running timers and flushing eventQueue
   */
  public close() {
    return this._client.close();
  }

  /**
   * Provide access to inner optimizely.Client object
   */
  public get client(): optimizely.Client {
    return this._client;
  }

  public get notificationCenter(): optimizely.NotificationCenter {
    return this._client.notificationCenter;
  }

  protected getUserContextWithOverrides(
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes
  ): UserInfo {
    const finalUserId: string | null = overrideUserId === undefined ? this.user.id : overrideUserId;
    const finalUserAttributes: optimizely.UserAttributes | undefined =
      overrideAttributes === undefined ? this.user.attributes : overrideAttributes;

    return {
      id: finalUserId,
      attributes: finalUserAttributes,
    };
  }
}

export function createInstance(config: optimizely.Config): ReactSDKClient {
  return new OptimizelyReactSDKClient(config);
}
