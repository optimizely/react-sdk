/**
 * Copyright 2018-2019, Optimizely
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
import * as React from 'react'
import { Subtract } from 'utility-types'

import { OptimizelyContextConsumer } from './Context'
import { ReactSDKClient } from './client'
import { hoistStaticsAndForwardRefs } from './utils'

export interface WithOptimizelyProps {
  optimizely: ReactSDKClient | null
  optimizelyReadyTimeout: number | undefined
  isServerSide: boolean
}

export type WithoutOptimizelyProps<P extends WithOptimizelyProps> = Subtract<
  P,
  WithOptimizelyProps
>

export function withOptimizely<P extends WithOptimizelyProps, R>(
  Component: React.ComponentType<P>,
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<WithoutOptimizelyProps<P>> & React.RefAttributes<R>
> {
  type WrapperProps = WithoutOptimizelyProps<P> & { forwardedRef?: React.Ref<R> }

  class WithOptimizely extends React.Component<WrapperProps> {
    render() {
      const { forwardedRef, ...rest } = this.props
      // Note: Casting props to P is necessary because of this TypeScript issue:
      // https://github.com/microsoft/TypeScript/issues/28884
      return (
        <OptimizelyContextConsumer>
          {(value: {
            optimizely: ReactSDKClient
            isServerSide: boolean
            timeout: number | undefined
          }) => (
            <Component
              {...rest as P}
              optimizelyReadyTimeout={value.timeout}
              optimizely={value.optimizely}
              isServerSide={value.isServerSide}
              ref={forwardedRef}
            />
          )}
        </OptimizelyContextConsumer>
      )
    }
  }

  const withRefsForwarded = hoistStaticsAndForwardRefs<R, WithoutOptimizelyProps<P>>(
    WithOptimizely,
    Component,
    'withOptimizely',
  )

  return withRefsForwarded
}
