/**
 * Copyright 2019, Optimizely
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

import * as optimizely from '@optimizely/optimizely-sdk'
import * as logging from '@optimizely/js-sdk-logging'

const logger = logging.getLogger('ReactSDK')

export type VariableValuesObject = {
  [key: string]: boolean | number | string | null
}

type DisposeFn = () => void

type OnUserUpdateHandler = (userInfo: UserContext) => void

export type OnReadyResult = {
  success: boolean
  reason?: string
}

const REACT_SDK_CLIENT_ENGINE = 'react-sdk'

export interface ReactSDKClient extends optimizely.Client {
  user: UserContext

  onReady(opts?: { timeout?: number }): Promise<any>
  setUser(userInfo: { id: string; attributes?: { [key: string]: any } }): void
  onUserUpdate(handler: OnUserUpdateHandler): DisposeFn

  activate(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null

  getVariation(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null

  getFeatureVariables(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): VariableValuesObject

  getFeatureVariableString(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null

  getFeatureVariableInteger(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): number | null

  getFeatureVariableBoolean(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean | null

  getFeatureVariableDouble(
    featureKey: string,
    variableKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): number | null

  isFeatureEnabled(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean

  getEnabledFeatures(
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): Array<string>

  track(
    eventKey: string,
    overrideUserId?: string | optimizely.EventTags,
    overrideAttributes?: optimizely.UserAttributes,
    eventTags?: optimizely.EventTags,
  ): void

  setForcedVariation(
    experiment: string,
    overrideUserIdOrVariationKey: string,
    variationKey?: string | null,
  ): boolean

  getForcedVariation(experiment: string, overrideUserId?: string): string | null
}

type UserContext = {
  id: string | null
  attributes: optimizely.UserAttributes
}

export const DEFAULT_ON_READY_TIMEOUT = 5000

class OptimizelyReactSDKClient implements ReactSDKClient {
  public initialConfig: optimizely.Config
  public user: UserContext = {
    id: null,
    attributes: {},
  }
  private userPromiseResovler: (user: UserContext) => void
  private userPromise: Promise<OnReadyResult>
  private isUserPromiseResolved: boolean = false
  private onUserUpdateHandlers: OnUserUpdateHandler[] = []

  private readonly _client: optimizely.Client

  // promise keeping track of async requests for initializing client instance
  private dataReadyPromise: Promise<OnReadyResult>

  /**
   * Creates an instance of OptimizelyReactSDKClient.
   * @param {optimizely.Config} [config={}]
   */
  constructor(config: optimizely.Config) {
    this.initialConfig = config

    this.userPromiseResovler = () => {}

    const configWithClientEngine = {
      ...config,
      clientEngine: REACT_SDK_CLIENT_ENGINE,
    }
    this._client = optimizely.createInstance(configWithClientEngine)

    this.userPromise = new Promise(resolve => {
      this.userPromiseResovler = resolve
    }).then(() => ({ success: true }))

    this.dataReadyPromise = Promise.all([this.userPromise, this._client.onReady()]).then(
      () => {
        return {
          success: true,
          reason: 'datafile and user resolved',
        }
      },
    )
  }

  onReady(config: { timeout?: number } = {}): Promise<OnReadyResult> {
    let timeoutId: number | undefined
    let timeout: number = DEFAULT_ON_READY_TIMEOUT
    if (config && config.timeout !== undefined) {
      timeout = config.timeout
    }

    const timeoutPromise = new Promise<OnReadyResult>(resolve => {
      timeoutId = setTimeout(() => {
        resolve({
          success: false,
          reason:
            'failed to initialize onReady before timeout, either the datafile or user info was not set before the timeout',
        })
      }, timeout) as any
    })

    return Promise.race([this.dataReadyPromise, timeoutPromise]).then(res => {
      clearTimeout(timeoutId)
      return res
    })
  }

  setUser(userInfo: { id?: string; attributes?: { [key: string]: any } }): void {
    // TODO add check for valid user
    if (userInfo.id) {
      this.user.id = userInfo.id
    }
    if (userInfo.attributes) {
      this.user.attributes = userInfo.attributes
    }
    if (!this.isUserPromiseResolved) {
      this.userPromiseResovler(this.user)
      this.isUserPromiseResolved = true
    }
    this.onUserUpdateHandlers.forEach(handler => handler(this.user))
  }

  onUserUpdate(handler: OnUserUpdateHandler): DisposeFn {
    this.onUserUpdateHandlers.push(handler)

    return () => {
      const ind = this.onUserUpdateHandlers.indexOf(handler)
      if (ind > -1) {
        this.onUserUpdateHandlers.splice(ind, 1)
      }
    }
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
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      logger.info(
        'Not activating experiment "%s" because userId is not set',
        experimentKey,
      )
      return null
    }
    return this._client.activate(experimentKey, user.id, user.attributes)
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
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      logger.info(
        'getVariation returned null for experiment "%s" because userId is not set',
        experimentKey,
      )
      return null
    }
    return this._client.getVariation(experimentKey, user.id, user.attributes)
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
    eventTags?: optimizely.EventTags,
  ) {
    if (typeof overrideUserId !== 'undefined' && typeof overrideUserId !== 'string') {
      eventTags = overrideUserId
      overrideUserId = undefined
      overrideAttributes = undefined
    }
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)

    if (user.id === null) {
      logger.info(
        'track for event "%s" not being sent because userId is not set',
        eventKey,
      )
      return
    }

    return this._client.track(eventKey, user.id, user.attributes, eventTags)
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
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      logger.info(
        'isFeatureEnabled returning false for feature "%s" because userId is not set',
        feature,
      )
      return false
    }
    return this._client.isFeatureEnabled(feature, user.id, user.attributes)
  }

  /**
   * Get all variables for a feature, regardless of the feature being enabled/disabled
   * @param {string} feature
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {VariableValuesObject}
   * @memberof OptimizelyReactSDKClient
   */
  public getFeatureVariables(
    featureKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): VariableValuesObject {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    const userId = user.id
    if (userId === null) {
      logger.info(
        'getFeatureVariables returning `{}` for feature "%s" because userId is not set',
        featureKey,
      )
      return {}
    }
    const userAttributes = user.attributes
    let variableObj: { [key: string]: any } = {}
    const config = (this._client as any).projectConfigManager.getConfig()
    if (!config) {
      return {}
    }
    const feature = config.featureKeyMap[featureKey]
    if (!feature) {
      return {}
    }
    let variables: object[] = feature.variables
    variables.forEach((variableDef: any) => {
      let type: any = variableDef.type
      let key: any = variableDef.key

      switch (type) {
        case 'string':
          variableObj[key] = this._client.getFeatureVariableString(
            featureKey,
            key,
            userId,
            userAttributes,
          )
          break

        case 'boolean':
          variableObj[key] = this._client.getFeatureVariableBoolean(
            featureKey,
            key,
            userId,
            userAttributes,
          )
          break

        case 'integer':
          variableObj[key] = this._client.getFeatureVariableInteger(
            featureKey,
            key,
            userId,
            userAttributes,
          )
          break

        case 'double':
          variableObj[key] = this._client.getFeatureVariableDouble(
            featureKey,
            key,
            userId,
            userAttributes,
          )
          break
      }
    })

    return variableObj
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
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      return null
    }
    return this._client.getFeatureVariableString(
      feature,
      variable,
      user.id,
      user.attributes,
    )
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
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      return null
    }
    return this._client.getFeatureVariableBoolean(
      feature,
      variable,
      user.id,
      user.attributes,
    )
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
    overrideAttributes?: optimizely.UserAttributes,
  ): number | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      return null
    }
    return this._client.getFeatureVariableInteger(
      feature,
      variable,
      user.id,
      user.attributes,
    )
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
    overrideAttributes?: optimizely.UserAttributes,
  ): number | null {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      return null
    }
    return this._client.getFeatureVariableDouble(
      feature,
      variable,
      user.id,
      user.attributes,
    )
  }

  /**
   * Get an array of all enabled features
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideUserId]
   * @returns {Array<string>}
   * @memberof OptimizelyReactSDKClient
   */
  public getEnabledFeatures(
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): Array<string> {
    const user = this.getUserContextWithOverrides(overrideUserId, overrideAttributes)
    if (user.id === null) {
      return []
    }
    return this._client.getEnabledFeatures(user.id, user.attributes)
  }

  /**
   * Gets the forced variation for a given user and experiment
   * @param {string} experiment
   * @param {string} [overrideUserId]
   * @returns {(string | null)}
   * @memberof OptimizelyReactSDKClient
   */
  public getForcedVariation(experiment: string, overrideUserId?: string): string | null {
    const user = this.getUserContextWithOverrides(overrideUserId)
    if (user.id === null) {
      return null
    }
    return this._client.getForcedVariation(experiment, user.id)
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
    variationKey?: string | null,
  ): boolean {
    let finalUserId: string | null = null
    let finalVariationKey: string | null = null
    if (arguments.length === 2) {
      finalVariationKey = overrideUserIdOrVariationKey
      finalUserId = this.getUserContextWithOverrides().id
    } else if (arguments.length === 3) {
      finalUserId = this.getUserContextWithOverrides(overrideUserIdOrVariationKey).id
      if (variationKey === undefined) {
        // can't have undefined if supplying all 3 arguments
        return false
      }
      finalVariationKey = variationKey
    }

    if (finalUserId === null) {
      return false
    }
    return this._client.setForcedVariation(experiment, finalUserId, finalVariationKey)
  }

  /**
   * Cleanup method for killing an running timers and flushing eventQueue
   */
  public close() {
    return this._client.close()
  }

  /**
   * Provide access to inner optimizely.Client object
   */
  public get client(): optimizely.Client {
    return this._client
  }

  public get notificationCenter(): optimizely.NotificationCenter {
    return this._client.notificationCenter
  }

  protected getUserContextWithOverrides(
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): UserContext {
    let finalUserId: string | null =
      overrideUserId === undefined ? this.user.id : overrideUserId
    let finalUserAttributes: optimizely.UserAttributes =
      overrideAttributes === undefined ? this.user.attributes : overrideAttributes

    return {
      id: finalUserId,
      attributes: finalUserAttributes,
    }
  }
}

export function createInstance(config: optimizely.Config): OptimizelyReactSDKClient {
  return new OptimizelyReactSDKClient(config)
}
