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
/// <reference types="jest" />

import * as React from 'react'
import * as Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
Enzyme.configure({ adapter: new Adapter() })

import { mount } from 'enzyme'
import { OptimizelyProvider } from './Provider'
import { withOptimizely } from './withOptimizely'
import { ReactSDKClient } from './client'

type TestProps = {
  optimizely: ReactSDKClient
  optimizelyReadyTimeout: number | undefined
  isServerSide: boolean
}

class InnerComponent extends React.Component<TestProps, any> {
  constructor(props: TestProps) {
    super(props)
  }

  render() {
    return <div>test</div>
  }
}

const WrapperComponent = withOptimizely(InnerComponent)

describe('withOptimizely', () => {
  let optimizelyClient: ReactSDKClient
  beforeEach(() => {
    optimizelyClient = ({
      setUser: jest.fn(),
    } as unknown) as ReactSDKClient
  })

  describe('when userId / userAttributes props are provided', () => {
    it('should call setUser with the correct user id / attributes', () => {
      const attributes = {
        foo: 'bar',
      }
      const userId = 'jordan'
      const component = mount(
        <OptimizelyProvider
          optimizely={optimizelyClient}
          timeout={200}
          userId={userId}
          userAttributes={attributes}
        >
          <WrapperComponent />
        </OptimizelyProvider>,
      )

      expect(optimizelyClient.setUser).toHaveBeenCalledTimes(1)
      expect(optimizelyClient.setUser).toHaveBeenCalledWith({ id: userId, attributes })
    })
  })

  describe('when only userId prop is provided', () => {
    it('should call setUser with the correct user id / attributes', () => {
      const userId = 'jordan'
      const component = mount(
        <OptimizelyProvider optimizely={optimizelyClient} timeout={200} userId={userId}>
          <WrapperComponent />
        </OptimizelyProvider>,
      )

      expect(optimizelyClient.setUser).toHaveBeenCalledTimes(1)
      expect(optimizelyClient.setUser).toHaveBeenCalledWith({
        id: userId,
        attributes: {},
      })
    })
  })

  describe(`when the user prop is passed only with "id"`, () => {
    it('should call setUser with the correct user id / attributes', () => {
      const userId = 'jordan'
      const component = mount(
        <OptimizelyProvider
          optimizely={optimizelyClient}
          timeout={200}
          user={{ id: userId }}
        >
          <WrapperComponent />
        </OptimizelyProvider>,
      )

      expect(optimizelyClient.setUser).toHaveBeenCalledTimes(1)
      expect(optimizelyClient.setUser).toHaveBeenCalledWith({
        id: userId,
        attributes: {},
      })
    })
  })

  describe(`when the user prop is passed with "id" and "attributes"`, () => {
    it('should call setUser with the correct user id / attributes', () => {
      const userId = 'jordan'
      const attributes = { foo: 'bar' }
      const component = mount(
        <OptimizelyProvider
          optimizely={optimizelyClient}
          timeout={200}
          user={{ id: userId, attributes }}
        >
          <WrapperComponent />
        </OptimizelyProvider>,
      )

      expect(optimizelyClient.setUser).toHaveBeenCalledTimes(1)
      expect(optimizelyClient.setUser).toHaveBeenCalledWith({
        id: userId,
        attributes,
      })
    })
  })

  describe('when both the user prop and userId / userAttributes props are passed', () => {
    it('should respect the user object prop', () => {
      const userId = 'jordan'
      const attributes = { foo: 'bar' }
      const component = mount(
        <OptimizelyProvider
          optimizely={optimizelyClient}
          timeout={200}
          user={{ id: userId, attributes }}
          userId="otherUserId"
          userAttributes={{ other: 'yo' }}
        >
          <WrapperComponent />
        </OptimizelyProvider>,
      )

      expect(optimizelyClient.setUser).toHaveBeenCalledTimes(1)
      expect(optimizelyClient.setUser).toHaveBeenCalledWith({
        id: userId,
        attributes,
      })
    })
  })

  it('should inject optimizely and optimizelyReadyTimeout from <OptimizelyProvider>', async () => {
    const component = mount(
      <OptimizelyProvider optimizely={optimizelyClient} timeout={200}>
        <WrapperComponent />
      </OptimizelyProvider>,
    )

    const innerComponent = component.find(InnerComponent)
    expect(innerComponent.props()).toEqual({
      optimizely: optimizelyClient,
      isServerSide: false,
      optimizelyReadyTimeout: 200,
    })

    expect(optimizelyClient.setUser).not.toHaveBeenCalled()
  })

  it('should inject the isServerSide prop', async () => {
    const component = mount(
      <OptimizelyProvider
        optimizely={optimizelyClient}
        timeout={200}
        isServerSide={true}
      >
        <WrapperComponent />
      </OptimizelyProvider>,
    )

    const innerComponent = component.find(InnerComponent)
    expect(innerComponent.props()).toEqual({
      optimizely: optimizelyClient,
      isServerSide: true,
      optimizelyReadyTimeout: 200,
    })
  })

  it('should forward refs', () => {
    interface FancyInputProps extends TestProps {
      defaultValue: string
    }
    const FancyInput: React.RefForwardingComponent<HTMLInputElement, FancyInputProps> = (
      props,
      ref,
    ) => <input ref={ref} className="fancyInput" defaultValue={props.defaultValue} />
    const ForwardingFancyInput = React.forwardRef(FancyInput)
    const OptimizelyInput = withOptimizely(ForwardingFancyInput)
    const inputRef: React.RefObject<HTMLInputElement> = React.createRef()

    const optimizelyMock: ReactSDKClient = ({
      setUser: jest.fn(),
    } as unknown) as ReactSDKClient

    const component = mount(
      <OptimizelyProvider
        optimizely={optimizelyMock}
        timeout={200}
        user={{ id: 'jordan' }}
        userAttributes={{ plan_type: 'bronze' }}
        isServerSide={true}
      >
        <OptimizelyInput ref={inputRef} defaultValue="hi" />
      </OptimizelyProvider>,
    )
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement)
    expect(typeof inputRef.current!.focus).toBe('function')
    const inputNode: HTMLInputElement = component.find('input').getDOMNode()
    expect(inputRef.current!).toBe(inputNode)
  })

  it('should hoist non-React statics', () => {
    class MyComponentWithAStatic extends React.Component<TestProps> {
      static foo(): string {
        return 'foo'
      }

      render() {
        return (
          <div>I have a static method</div>
        )
      }
    }
    const OptlyComponent = withOptimizely(MyComponentWithAStatic)
    expect(typeof (OptlyComponent as any).foo).toBe('function')
    expect((OptlyComponent as any).foo()).toBe('foo')
  })
})
