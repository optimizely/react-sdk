/**
 * Copyright 2018-2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

import React from "react"
import { OptimizelyContext } from "../Context"
import {
  OnReadyResult,
  VariableValuesObject,
  DEFAULT_ON_READY_TIMEOUT
} from "../client"
import { getLogger } from "@optimizely/js-sdk-logging"

const logger = getLogger("useOptimizelyFeature")

interface UseOptimizelyFeatureOptions {
  timeout?: number
  autoUpdate?: boolean
}

export function useOptimizelyFeature(
  feature: string,
  options: UseOptimizelyFeatureOptions = {}
) {
  const context = React.useContext(OptimizelyContext)
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false)
  const [variables, setVariables] = React.useState<VariableValuesObject>({})
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    let cancelled = false
    let optimizelyNotificationId: number
    let unregisterUserListener: () => void
    setLoading(true)

    if (context.optimizely === null) {
      throw new Error("optimizely prop must be supplied")
    }

    const timeout = options.timeout || context.timeout

    const updateState = () => {
      if (cancelled) return
      if (context.optimizely === null) {
        throw new Error("optimizely prop must be supplied")
      }
      setIsEnabled(context.optimizely.isFeatureEnabled(feature))
      setVariables(context.optimizely.getFeatureVariables(feature))
      setLoading(false)
    }

    context.optimizely.onReady({ timeout }).then((result: OnReadyResult) => {
      if (result.success) {
        logger.info(
          'feature="%s" successfully rendered for user="%s"',
          feature,
          context.optimizely && context.optimizely.user.id
        )
      } else {
        logger.info(
          'feature="%s" could not be checked before timeout of %sms, reason="%s" ',
          feature,
          timeout === undefined ? DEFAULT_ON_READY_TIMEOUT : timeout,
          result.reason || ""
        )
      }
      updateState()
    })

    if (options.autoUpdate === true) {
      optimizelyNotificationId = context.optimizely.notificationCenter.addNotificationListener(
        "OPTIMIZELY_CONFIG_UPDATE",
        updateState
      )
      unregisterUserListener = context.optimizely.onUserUpdate(updateState)
    }

    return () => {
      cancelled = true
      if (optimizelyNotificationId && context.optimizely) {
        context.optimizely.notificationCenter.removeNotificationListener(
          optimizelyNotificationId
        )
      }
      if (unregisterUserListener && context.optimizely) {
        unregisterUserListener()
      }
    }
  }, [context.optimizely])

  return {
    isEnabled,
    variables,
    loading
  }
}
