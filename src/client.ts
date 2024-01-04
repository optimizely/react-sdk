/**
 * Copyright 2019-2023, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as optimizely from '@optimizely/optimizely-sdk';
import { OptimizelyDecision, UserInfo, createFailedDecision, areUsersEqual } from './utils';
import { notifier } from './notifier';
import { logger } from './logger';

export type VariableValuesObject = {
  [key: string]: any;
};

type DisposeFn = () => void;

type OnUserUpdateHandler = (userInfo: UserInfo) => void;

type OnForcedVariationsUpdateHandler = () => void;

type NotReadyReason = 'TIMEOUT' | 'NO_CLIENT' | 'USER_NOT_READY';

type ResolveResult = {
  success: boolean;
  reason?: NotReadyReason;
  message?: string;
};

export interface OnReadyResult extends ResolveResult {
  dataReadyPromise?: Promise<any>;
}

const REACT_SDK_CLIENT_ENGINE = 'react-sdk';
const REACT_SDK_CLIENT_VERSION = '3.0.0-beta2';

export const DefaultUser: UserInfo = {
  id: null,
  attributes: {},
};

export interface ReactSDKClient extends Omit<optimizely.Client, 'createUserContext'> {
  user: UserInfo;

  onReady(opts?: { timeout?: number }): Promise<any>;
  setUser(userInfo: UserInfo): Promise<void>;
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

  getForcedDecision(decisionContext: optimizely.OptimizelyDecisionContext): optimizely.OptimizelyForcedDecision | null;

  fetchQualifiedSegments(options?: optimizely.OptimizelySegmentOption[]): Promise<boolean>;

  getCurrentUserContext(): optimizely.OptimizelyUserContext | null;

  setCurrentUserContext(userInfo: UserInfo): void;

  makeUserContextInstance(userInfo: UserInfo): optimizely.OptimizelyUserContext | null;

  getVuid(): string | undefined;
}

export const DEFAULT_ON_READY_TIMEOUT = 5_000;

class OptimizelyReactSDKClient implements ReactSDKClient {
  private userContext: optimizely.OptimizelyUserContext | null = null;
  private onUserUpdateHandlers: OnUserUpdateHandler[] = [];
  private onForcedVariationsUpdateHandlers: OnForcedVariationsUpdateHandler[] = [];
  private forcedDecisionFlagKeys: Set<string> = new Set<string>();

  // Is the javascript SDK instance ready.
  private isClientReady = false;

  // We need to add autoupdate listener to the hooks after the instance became fully ready to avoid redundant updates to hooks
  private isReadyPromiseFulfilled = false;

  private isUsingSdkKey = false;

  private readonly _client: optimizely.Client | null;

  // promise keeping track of async requests for initializing client instance
  private dataReadyPromise: Promise<OnReadyResult>;

  public initialConfig: optimizely.Config;
  public user: UserInfo = { ...DefaultUser };

  /**
   * Creates an instance of OptimizelyReactSDKClient.
   * @param {optimizely.Config} [config={}]
   */
  constructor(config: optimizely.Config) {
    this.initialConfig = config;

    const configWithClientInfo = {
      ...config,
      clientEngine: REACT_SDK_CLIENT_ENGINE,
      clientVersion: REACT_SDK_CLIENT_VERSION,
    };

    this._client = optimizely.createInstance(configWithClientInfo);
    this.isClientReady = !!configWithClientInfo.datafile;
    this.isUsingSdkKey = !!configWithClientInfo.sdkKey;

    if (this._client) {
      this.dataReadyPromise = this._client.onReady().then((clientResult: { success: boolean }) => {
        this.isReadyPromiseFulfilled = true;
        this.isClientReady = true;

        return {
          success: true,
          message: clientResult.success
            ? 'Successfully resolved client datafile.'
            : 'Client datafile was not not ready.',
        };
      });
    } else {
      logger.warn('Unable to resolve datafile and user information because Optimizely client failed to initialize.');

      this.dataReadyPromise = new Promise(resolve => {
        resolve({
          success: false,
          reason: 'NO_CLIENT',
          message: 'Optimizely client failed to initialize.',
        });
      });
    }
  }

  public getIsReadyPromiseFulfilled(): boolean {
    return this.isReadyPromiseFulfilled;
  }

  public isReady(): boolean {
    return this.isClientReady;
  }

  public getIsUsingSdkKey(): boolean {
    return this.isUsingSdkKey;
  }

  public onReady(config: { timeout?: number } = {}): Promise<OnReadyResult> {
    let timeoutId: number | undefined;
    let timeout: number = DEFAULT_ON_READY_TIMEOUT;
    if (config && config.timeout !== undefined) {
      timeout = config.timeout;
    }

    const timeoutPromise = new Promise<OnReadyResult>(resolve => {
      timeoutId = setTimeout(() => {
        resolve({
          success: false,
          reason: 'TIMEOUT',
          message:
            'failed to initialize onReady before timeout, either the datafile or user info was not set before the timeout',
          dataReadyPromise: this.dataReadyPromise,
        });
      }, timeout) as any;
    });

    return Promise.race([this.dataReadyPromise, timeoutPromise]).then(async res => {
      clearTimeout(timeoutId);
      if (res.success && !this.initialConfig.odpOptions?.disabled) {
        const isSegmentsFetched = await this.fetchQualifiedSegments();
        if (!isSegmentsFetched) {
          return {
            success: false,
            reason: 'USER_NOT_READY',
            message: 'Failed to fetch qualified segments',
          };
        }
      }
      return res;
    });
  }

  protected getUserWithOverrides(overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): UserInfo {
    const id: string | null = overrideUserId === undefined ? this.user.id : overrideUserId;
    const attributes: optimizely.UserAttributes | undefined =
      overrideAttributes === undefined ? this.user.attributes : overrideAttributes;

    return {
      id,
      attributes,
    };
  }

  public getCurrentUserContext(): optimizely.OptimizelyUserContext | null {
    if (!this._client || !this.isReady()) {
      logger.warn('Unable to get user context. Optimizely client not initialized or ready.');
      return null;
    }

    if (!this.userContext) {
      logger.warn('Unable to get user context. User context not set.');
      return null;
    }

    return this.userContext;
  }

  public setCurrentUserContext(userInfo: UserInfo): void {
    if (!this._client || !this.isReady()) {
      logger.warn(`Unable to set user context for user ID ${userInfo.id}. Optimizely client not initialized or ready.`);
      return;
    }

    if (!this.userContext || (this.userContext && !areUsersEqual(userInfo, this.user))) {
      this.userContext = this._client.createUserContext(userInfo.id || undefined, userInfo.attributes);
    }
  }

  public makeUserContextInstance(userInfo: UserInfo): optimizely.OptimizelyUserContext | null {
    if (!this._client || !this.isReady()) {
      logger.warn(
        `Unable to create user context for ${userInfo.id}. Optimizely client failed to initialize or not ready.`
      );
      return null;
    }

    return this._client.createUserContext(userInfo.id || undefined, userInfo.attributes);
  }

  public async fetchQualifiedSegments(options?: optimizely.OptimizelySegmentOption[]): Promise<boolean> {
    if (!this.userContext || !this.isReady()) {
      return false;
    }

    return await this.userContext.fetchQualifiedSegments(options);
  }

  public async setUser(userInfo: UserInfo): Promise<void> {
    //reset user info
    this.user = { ...DefaultUser };

    this.user.id = userInfo.id;

    this.setCurrentUserContext(userInfo);

    if (userInfo.attributes) {
      this.user.attributes = userInfo.attributes;
    }

    if (this.getIsReadyPromiseFulfilled()) {
      await this.fetchQualifiedSegments();
    }

    this.onUserUpdateHandlers.forEach(handler => handler(this.user));
  }

  public onUserUpdate(handler: OnUserUpdateHandler): DisposeFn {
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
  public onForcedVariationsUpdate(handler: OnForcedVariationsUpdateHandler): DisposeFn {
    this.onForcedVariationsUpdateHandlers.push(handler);

    return (): void => {
      const ind = this.onForcedVariationsUpdateHandlers.indexOf(handler);
      if (ind > -1) {
        this.onForcedVariationsUpdateHandlers.splice(ind, 1);
      }
    };
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
    if (!this._client) {
      logger.warn('Unable to activate experiment "%s" because Optimizely client failed to initialize.', experimentKey);
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to activate experiment "%s" because User ID is not set', experimentKey);
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
    if (!this._client) {
      logger.warn('Unable to evaluate feature "%s" because Optimizely client failed to initialize.', key);
      return createFailedDecision(
        key,
        `Unable to evaluate flag ${key} because Optimizely client failed to initialize.`,
        this.user
      );
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to evaluate feature "%s" because User ID is not set.', key);
      return createFailedDecision(key, `Unable to evaluate flag ${key} because User ID is not set.`, user);
    }

    const optlyUserContext = this.makeUserContextInstance(user);
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
    if (!this._client) {
      logger.warn('Unable to evaluate features for keys because Optimizely client failed to initialize.');
      return {};
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to evaluate features for keys because User ID is not set');
      return {};
    }

    const optlyUserContext = this.makeUserContextInstance(user);
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
    if (!this._client) {
      logger.warn('Unable to evaluate all feature decisions because Optimizely client is not initialized.');
      return {};
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to evaluate all feature decisions because User ID is not set');
      return {};
    }

    const optlyUserContext = this.makeUserContextInstance(user);
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
    if (!this._client) {
      logger.warn(
        'Unable to get variation for experiment "%s" because Optimizely client failed to initialize.',
        experimentKey
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get variation for experiment "%s" because User ID is not set', experimentKey);
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
    if (!this._client) {
      logger.warn('Unable to send tracking event "%s" because Optimizely client failed to initialize.', eventKey);
      return;
    }

    if (typeof overrideUserId !== 'undefined' && typeof overrideUserId !== 'string') {
      eventTags = overrideUserId;
      overrideUserId = undefined;
      overrideAttributes = undefined;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to send tracking event "%s" because User ID is not set', eventKey);
      return;
    }

    this._client.track(eventKey, user.id, user.attributes, eventTags);
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
      logger.warn('Unable to set a forced decision because the user context has not been set yet.');
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
      logger.warn('Unable to get a forced decision because the user context has not been set yet.');
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
      logger.warn('Unable to remove forced decisions because the user context has not been set yet.');
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
      logger.warn('Unable to remove all forced decisions because the user context has not been set yet.');
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
    if (!this._client) {
      logger.warn(
        'Unable to determine if feature "%s" is enabled because Optimizely client failed to initialize.',
        feature
      );
      return false;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to determine if feature "%s" is enabled because User ID is not set', feature);
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
    if (!this._client) {
      logger.warn(
        'Unable to get feature variables for feature "%s" because Optimizely client failed to initialize.',
        featureKey
      );
      return {};
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    const userId = user.id;
    if (userId === null) {
      logger.warn('Unable to get feature variables for feature "%s" because User ID is not set', featureKey);
      return {};
    }

    const userAttributes = user.attributes;
    const variableObj: VariableValuesObject = {};

    const optlyConfig = this._client.getOptimizelyConfig();
    if (!optlyConfig) {
      logger.warn(
        'Unable to retrieve feature variables for feature "%s" because Optimizely client failed to initialize.',
        featureKey
      );
      return {};
    }

    const feature = optlyConfig.featuresMap[featureKey];
    if (!feature) {
      logger.info(
        'Unable to retrieve feature variables for feature "%s" because config features map is not set',
        featureKey
      );
      return {};
    }

    Object.keys(feature.variablesMap).forEach(key => {
      const variable = feature.variablesMap[key];
      variableObj[variable.key] = this._client!.getFeatureVariable(featureKey, variable.key, userId, userAttributes);
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
    if (!this._client) {
      logger.warn(
        'Unable to get feature variable string from feature "%s" because Optimizely client failed to initialize.',
        feature
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get feature variable string from feature "%s" because User ID is not set', feature);
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
    if (!this._client) {
      logger.warn(
        'Unable to get feature variable boolean from feature "%s" because Optimizely client failed to initialize.',
        feature
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get feature variable boolean from feature "%s" because User ID is not set', feature);
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
    if (!this._client) {
      logger.warn(
        'Unable to get feature variable integer from feature "%s" because Optimizely client failed to initialize.',
        feature
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get feature variable integer from feature "%s" because User ID is not set', feature);
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
    if (!this._client) {
      logger.warn(
        'Unable to get feature variable double from feature "%s" because Optimizely client failed to initialize.',
        feature
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get feature variable double from feature "%s" because User ID is not set', feature);
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
    if (!this._client) {
      logger.warn(
        'Unable to get feature variable JSON from feature "%s" because Optimizely client failed to initialize.',
        feature
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get feature variable JSON from feature "%s" because User ID is not set', feature);
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
  public getFeatureVariable(
    featureKey: string,
    variableKey: string,
    overrideUserId: string,
    overrideAttributes?: optimizely.UserAttributes
  ): unknown {
    if (!this._client) {
      logger.warn(
        'Unable to get feature variable from feature "%s" because Optimizely client failed to initialize.',
        featureKey,
        variableKey
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info(
        'Unable to get feature variable from feature "%s" because User ID is not set',
        featureKey,
        variableKey
      );
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
  public getAllFeatureVariables(
    featureKey: string,
    overrideUserId: string,
    overrideAttributes?: optimizely.UserAttributes
  ): { [variableKey: string]: unknown } | null {
    if (!this._client) {
      logger.warn(
        'Unable to get all feature variables from feature "%s" because Optimizely client failed to initialize.',
        featureKey
      );
      return {};
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get all feature variables from feature "%s" because User ID is not set', featureKey);
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
    if (!this._client) {
      logger.warn('Unable to get list of enabled features because Optimizely client failed to initialize.');
      return [];
    }

    const user = this.getUserWithOverrides(overrideUserId, overrideAttributes);

    if (user.id === null) {
      logger.info('Unable to get list of enabled features because User ID is not set');
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
    if (!this._client) {
      logger.warn(
        'Unable to get forced variation for experiment "%s" because Optimizely client failed to initialize.',
        experiment
      );
      return null;
    }

    const user = this.getUserWithOverrides(overrideUserId);

    if (user.id === null) {
      logger.info('Unable to get forced variation for experiment "%s" because User ID is not set', experiment);
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
    if (!this._client) {
      logger.warn(
        'Unable to set forced variation for experiment "%s" because Optimizely client failed to initialize.',
        experiment
      );
      return false;
    }

    let finalUserId: string | null = null;
    let finalVariationKey: string | null = null;
    if (arguments.length === 2) {
      finalVariationKey = overrideUserIdOrVariationKey;
      finalUserId = this.getUserWithOverrides().id;
    } else if (arguments.length === 3) {
      finalUserId = this.getUserWithOverrides(overrideUserIdOrVariationKey).id;
      if (variationKey === undefined) {
        // can't have undefined if supplying all 3 arguments
        return false;
      }
      finalVariationKey = variationKey;
    }

    if (finalUserId === null) {
      logger.warn('Unable to set forced variation for experiment "%s" because User ID is not set', experiment);
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
    if (!this._client) {
      logger.warn('Unable to get Optimizely configuration because Optimizely client failed to initialize.');
      return null;
    }
    return this._client.getOptimizelyConfig();
  }

  /**
   * Cleanup method for killing an running timers and flushing eventQueue
   * @returns {Promise<{ success: boolean; reason?: string }>}
   */
  public close(): Promise<{ success: boolean; reason?: string }> {
    if (!this._client) {
      /**
       * Note:
       * - Returns a promise that resolves as "true" even when this._client does not exist.
       * - This is because cleanup relies on close() resolving as "true".
       * - If we resolve as "false", then the cleanup for timers and the event queue will never trigger.
       * - Not triggering cleanup may lead to memory leaks and other inefficiencies.
       */
      return new Promise<{ success: boolean; reason: string }>((resolve, reject) =>
        resolve({
          success: true,
          reason: 'Optimizely client is not initialized.',
        })
      );
    }
    return this._client.close();
  }

  /**
   * Provide access to inner optimizely.Client object
   */
  public get client(): optimizely.Client | null {
    if (!this._client) {
      logger.warn('Unable to get client because Optimizely client failed to initialize.');
      return null;
    }
    return this._client;
  }

  public get notificationCenter(): optimizely.NotificationCenter {
    if (!this._client) {
      return {
        addNotificationListener: () => {
          logger.warn('Unable to add notification listener because Optimizely client failed to initialize.');
          return 0;
        },
        removeNotificationListener: () => {
          logger.warn('Unable to remove notification listener because Optimizely client failed to initialize.');
          return false;
        },
        clearAllNotificationListeners: () => {
          logger.warn('Unable to clear all notification listeners because Optimizely client failed to initialize.');
        },
        clearNotificationListeners: () => {
          logger.warn('Unable to clear notification listeners because Optimizely client failed to initialize.');
        },
      };
    }
    return this._client.notificationCenter;
  }

  public sendOdpEvent(
    action: string,
    type?: string,
    identifiers?: Map<string, string>,
    data?: Map<string, unknown>
  ): void {
    if (!action || !action.trim()) {
      logger.error('ODP action is not valid (cannot be empty).');
      return;
    }

    this.client?.sendOdpEvent(action, type, identifiers, data);
  }

  public getVuid(): string | undefined {
    if (!this._client) {
      logger.warn('Unable to get VUID because Optimizely client failed to initialize.');
      return undefined;
    }
    return this._client.getVuid();
  }
}

export function createInstance(config: optimizely.Config): ReactSDKClient {
  return new OptimizelyReactSDKClient(config);
}
