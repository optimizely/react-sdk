# Optimizely React SDK

This repository houses the React SDK for use with Optimizely Full Stack and Optimizely Rollouts.

Optimizely Full Stack is A/B testing and feature flag management for product development teams. Experiment in any application. Make every feature on your roadmap an opportunity to learn. Learn more at https://www.optimizely.com/platform/full-stack/, or see the [documentation](https://docs.developers.optimizely.com/full-stack/docs).

Optimizely Rollouts is free feature flags for development teams. Easily roll out and roll back features in any application without code deploys. Mitigate risk for every feature on your roadmap. Learn more at https://www.optimizely.com/rollouts/, or see the [documentation](https://docs.developers.optimizely.com/rollouts/docs).

### Features

- Automatic datafile downloading
- User ID + attributes memoization
- Render blocking until datafile is ready via a React API
- Optimizely timeout (only block rendering up to the number of milliseconds you specify)
- Library of React components to use with [feature flags](https://docs.developers.optimizely.com/full-stack/docs/use-feature-flags) and [A/B tests](https://docs.developers.optimizely.com/full-stack/docs/run-a-b-tests)

### Compatibility

The React SDK is compatible with `React 16.3.0 +`

### Example

```jsx
import {
  createInstance,
  OptimizelyProvider,
  OptimizelyExperiment,
  OptimizelyVariation,
  OptimizelyFeature,
} from '@optimizely/react-sdk'

const optimizely = createInstance({
  sdkKey: 'your-optimizely-sdk-key',
})

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider
        optimizely={optimizely}
        timeout={500}
        user={{id: window.userId, attributes: {plan_type: 'bronze'}}}
      >
        <OptimizelyExperiment experiment="ab-test">
          {(variation) => (
            <p>got variation {variation}</p>
          )}
        </OptimizelyExperiment>

        <OptimizelyExperiment experiment="button-color">
          <OptimizelyVariation variation="blue">
            <BlueButton />
          </OptimizelyVariation>

          <OptimizelyVariation variation="green">
            <GreenButton />
          </OptimizelyVariation>

          <OptimizelyVariation default>
            <DefaultButton />
          </OptimizelyVariation>
        </OptimizelyExperiment>

        <OptimizelyFeature feature="sort-algorithm">
          {(isEnabled, variables) => (
            <SearchComponent algorithm={variables.algorithm} />
          )}
        </OptimizelyFeature>
      </OptimizelyProvider>
    )
  }
}

```
# Contents
1. [Installation](#installation)
2. [Usage](#usage)
3. [Credits](#credits)
4. [Additional code](#additional-code)
5. [Contribute to this repo](#contribute-to-this-repo)


# Installation

```
npm install @optimizely/react-sdk
```
# Usage

## `createInstance`

The `ReactSDKClient` client created via `createInstance` is the programmatic API to evaluating features and experiments and tracking events. The `ReactSDKClient` is what powers the rest of the ReactSDK internally.

*arguments*
* `config : object` Object with SDK configuration parameters. This has the same format as the object passed to the `createInstance` method of the core `@optimizely/javascript-sdk` module. For details on this object, see the following pages from the developer docs:
  - [Instantiate](https://docs.developers.optimizely.com/full-stack/docs/instantiate)
  - [Initialize a non-mobile SDK](https://docs.developers.optimizely.com/full-stack/docs/initialize-a-non-mobile-sdk)
  - [JavaScript: Update datafiles](https://docs.developers.optimizely.com/full-stack/docs/javascript-update-datafiles)

*returns*
- A `ReactSDKClient` instance.

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk'

const optimizely = createInstance({
  datafile: window.datafile,
})
```

## `<OptimizelyProvider>`

Required at the root level. Leverages React’s `Context` API to allow access to the `ReactSDKClient` to components like `<OptimizelyFeature>` and `<OptimizelyExperiment>`.

*props*
* `optimizely : ReactSDKClient` created from `createInstance`
* `user: { id: string; attributes?: { [key: string]: any } } | Promise` User info object - `id` and `attributes` will be passed to the SDK for every feature flag, A/B test, or `track` call, or a `Promise` for the same kind of object
* `timeout : Number` (optional) The amount of time for OptimizelyExperiment and OptimizelyFeature components to render `null` while waiting for the SDK instance to become ready, before resolving..
* `isServerSide : Boolean` (optional) must pass `true` here for server side rendering
* `userId : String` (optional) ***Deprecated, prefer using `user` instead***. Another way to provide user id. The `user` object prop takes precedence when both are provided.
* `userAttributes : Object` : (optional) ***Deprecated, prefer using `user` instead***. Another way to provide user attributes. The `user` object prop takes precedence when both are provided.
### Readiness
Before rendering real content, both the datafile and the user must be available to the SDK.
#### Load the datafile synchronously

Synchronous loading is the preferred method to ensure that Optimizely is always ready and doesn't add any delay or asynchronous complexity to your application.

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk'

const optimizely = createInstance({
  datafile: window.datafile,
})

class AppWrapper extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely} user={{id: window.userId}}>
        <App />
      </OptimizelyProvider>
    )
  }
}
```

#### Load the datafile asynchronously

If you don't have the datafile downloaded, the `ReactSDKClient` can fetch the datafile for you. However, instead of waiting for the datafile to fetch before you render your app, you can immediately render your app and provide a `timeout` option to `<OptimizelyProvider optimizely={optimizely} timeout={200}>`. This will block rendering of `<OptimizelyExperiment>` and `<OptimizelyFeature>` components until the datafile loads or the timeout is up (in this case, `variation` is `null` and `isFeatureEnabled` is `false`).

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk'

const optimizely = createInstance({
  sdkKey: 'your-optimizely-sdk-key', // Optimizely environment key
})

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider
        optimizely={optimizely}
        timeout={500}
        user={{id: window.userId, attributes: {plan_type: 'bronze'}}}
      >
        <HomePage />
      </OptimizelyProvider>
    )
  }
}
```

#### Set user asynchronously
If user information is synchronously available, it can be provided as the `user` object prop, as in prior examples. But, if user information must be fetched asynchronously, the `user` prop can be a `Promise` for a `user` object with the same properties (`id` and `attributes`):

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk'
import { fetchUser } from './user'

const optimizely = createInstance({
  datafile: window.datafile,
})

const userPromise = fetchUser() // fetchUser returns a Promise for an object with { id, attributes }

class AppWrapper extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely} user={userPromise}>
        <App />
      </OptimizelyProvider>
    )
  }
}
```
## `OptimizelyExperiment`

*props*
* `experiment : string` Key of the experiment
* `autoUpdate : boolean` (optional) If true, this component will re-render in response to datafile or user changes. Default: `false`.
* `timeout : number` (optional) Rendering timeout as described in the `OptimizelyProvider` section. Overrides any timeout set on the ancestor `OptimizelyProvider`.
* `children : React.ReactNode | Function` Content or function returning content to be rendered based on the experiment variation. See usage examples below.

### Render different components based on variation

You can use OptimizelyExperiment via a child render function. If the component contains a function as a child, `<OptimizelyExperiment>` will call that function, with the result of `optimizely.activate(experimentKey)`.

```jsx
import { OptimizelyExperiment } from '@optimizely/react-sdk'

function ExperimentComponent() {
  return (
    <OptimizelyExperiment experiment="exp1">
      {(variation) => (
        variation === 'simple'
          ? <SimpleComponent />
          : <DetailedComponent />
      )}
    </OptimizelyExperiment>
  )
}
```

You can also use the `<OptimizelyVariation>` component (see below):

## `OptimizelyVariation`

`OptimizelyVariation` is used with a parent `OptimizelyExperiment` to render different content for different variations.

*props*
* `variation : string` Key of variation for which child content should be rendered
* `default : boolean` (optional) When `true`, child content will be rendered in the default case (`null` variation returned from the client)
* `children: React.ReactNode` Content to be rendered for this variation

```jsx
import { OptimizelyExperiment, OptimizelyVariation } from '@optimizely/react-sdk'

function ExperimentComponent() {
  return (
    <OptimizelyExperiment experiment="exp1">
      <OptimizelyVariation variation="simple">
        <SimpleComponent />
      </OptimizelyVariation>

      <OptimizelyVariation variation="detailed">
        <ComplexComponent />
      </OptimizelyVariation>

      <OptimizelyVariation default>
        <SimpleComponent />
      </OptimizelyVariation>
    </OptimizelyExperiment>
  )
}
```

**Note: If you are loading the datafile or the user asynchrounously, be sure to include an `<OptimizelyVariation default>` component as the render path if the datafile or user fails to load.**

## `OptimizelyFeature`

*props*
* `feature : string` Key of the feature
* `autoUpdate : boolean` (optional) If true, this component will re-render in response to datafile or user changes. Default: `false`.
* `timeout : number` (optional) Rendering timeout as described in the `OptimizelyProvider` section. Overrides any timeout set on the ancestor `OptimizelyProvider`.
* `children : React.ReactNode | Function` Content or function returning content to be rendered based on the enabled status and variable values of the feature. See usage examples below.

### Render something if feature is enabled

```jsx
import { OptimizelyFeature } from '@optimizely/react-sdk'

function FeatureComponent() {
  return (
    <OptimizelyFeature feature="new-login-page">
      {(isEnabled) => (
        <a href={isEnabled ? "/login" : "/login2"}>
          Login
        </a>
      )}
    </OptimizelyFeature>
  )
}
```

### Render feature variables

`variables` provide additional configuration for a feature and is a [feature of Optimizely FullStack](https://docs.developers.optimizely.com/full-stack/docs/define-feature-variables). `variables` are not available in Optimizely Rollouts.

```jsx
import { OptimizelyFeature } from '@optimizely/react-sdk'

function FeatureComponent() {
  return (
    <OptimizelyFeature feature="new-login-page">
      {(isEnabled, variables) => (
        <a href={isEnabled ? "/login" : "/login2"}>
          {variables.loginText}
        </a>
      )}
    </OptimizelyFeature>
  )
}
```

## `withOptimizely`

Any component under the `<OptimizelyProvider>` can access the Optimizely `ReactSDKClient` via the higher-order component (HoC) `withOptimizely`.

*arguments*
* `Component : React.Component` Component which will be enhanced with the following props:
  * `optimizely : ReactSDKClient` The client object which was passed to the `OptimizelyProvider`
  * `optimizelyReadyTimeout : number | undefined` The timeout which was passed to the `OptimizelyProvider`
  * `isServerSide : boolean` Value that was passed to the `OptimizelyProvider`

*returns*
* A wrapped component with additional props as described above

### Example
```jsx
import { withOptimizely } from '@optimizely/react-sdk'

class MyComp extends React.Component {
  constructor(props) {
    super(props)
    const { optimizely } = this.props
    const isFeat1Enabled = optimizely.isFeatureEnabled('feat1')
    const feat1Variables = optimizely.getFeatureVariables('feat1')

    this.state = {
      isFeat1Enabled,
      feat1Variables,
    }
  }

  render() {
  }
}

const WrappedMyComponent = withOptimizely(MyComp)
```

***Note:*** The `optimizely` client object provided via `withOptimizely` is automatically associated with the `user` prop passed to the ancestor `OptimizelyProvider` - the `id` and `attributes` from that `user` object will be automatically forwarded to all appropriate SDK method calls. So, there is no need to pass the `userId` or `attributes` arguments when calling methods of the `optimizely` client object, unless you wish to use *different* `userId` or `attributes` than those given to `OptimizelyProvider`.

### Tracking

Use the `withOptimizely` HoC for tracking.

```jsx
import { withOptimizely } from '@optimizely/react-sdk'

class SignupButton extends React.Component {
  onClick = () => {
    const { optimizely } = this.props
    optimizely.track('signup-clicked')
    // rest of click handler
  }

  render() {
    <button onClick={this.onClick}>
      Signup
    </button>
  }
}

const WrappedSignupButton = withOptimizely(SignupButton)
```

***Note:*** As mentioned above, the `optimizely` client object provided via `withOptimizely` is automatically associated with the `user` prop passed to the ancestor `OptimizelyProvider.` There is no need to pass `userId` or `attributes` arguments when calling `track`, unless you wish to use *different* `userId` or `attributes` than those given to `OptimizelyProvider`.

## `ReactSDKClient`

The following type definitions are used in the `ReactSDKClient` interface:

* `UserAttributes : { [name: string]: any }`
* `User : { id: string | null, attributes: userAttributes }`
* `VariableValuesObject : { [key: string]: boolean | number | string | null }`
* `EventTags : { [key: string]: string | number | boolean; }`

`ReactSDKClient` instances have the methods/properties listed below. Note that in general, the API largely matches that of the core `@optimizely/optimizely-sdk` client instance, which is documented on the [Optimizely X Full Stack developer docs site](https://docs.developers.optimizely.com/full-stack/docs). The major exception is that, for most methods, user id & attributes are ***optional*** arguments. `ReactSDKClient` has a current user. This user's id & attributes are automatically applied to all method calls, and overrides can be provided as arguments to these method calls if desired.

* `onReady(opts?: { timeout?: number }): Promise` Returns a Promise that fulfills with an object representing the datafile fetch process. See [JavaScript: Update datafiles](https://docs.developers.optimizely.com/full-stack/docs/javascript-update-datafiles)
* `user: User` The current user associated with this client instance
* `setUser(userInfo: User): void` Call this to update the current user
* `onUserUpdate(handler: (userInfo: User) => void): () => void` Subscribe a callback to be called when this instance's current user changes. Returns a function that will unsubscribe the callback.
* `activate(experimentKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null` Activate an experiment, and return the variation for the given user.
* `getVariation(experimentKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null` Return the variation for the given experiment and user.
* `getFeatureVariables(featureKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): VariableValuesObject`: Decide and return variable values for the given feature and user
* `getFeatureVariableString(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): string | null`: Decide and return the variable value for the given feature, variable, and user
* `getFeatureVariableInteger(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): number | null` Decide and return the variable value for the given feature, variable, and user
* `getFeatureVariableBoolean(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): boolean | null` Decide and return the variable value for the given feature, variable, and user
* `getFeatureVariableDouble(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): number | null` Decide and return the variable value for the given feature, variable, and user
* `isFeatureEnabled(featureKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): boolean` Return the enabled status for the given feature and user
* `getEnabledFeatures(overrideUserId?: string, overrideAttributes?: UserAttributes): Array<string>`: Return the keys of all features enabled for the given user
* `track(eventKey: string, overrideUserId?: string | EventTags, overrideAttributes?: UserAttributes, eventTags?: EventTags): void` Track an event to the Optimizely results backend
* `setForcedVariation(experiment: string, overrideUserIdOrVariationKey: string, variationKey?: string | null): boolean` Set a forced variation for the given experiment, variation, and user
* `getForcedVariation(experiment: string, overrideUserId?: string): string | null` Get the forced faration for the given experiment, variation, and user

## Rollout or experiment a feature user-by-user

To rollout or experiment on a feature by user rather than by random percentage, you will use Attributes and Audiences. To do this, follow the documentation on how to [run a beta](https://docs.developers.optimizely.com/rollouts/docs/run-a-beta) using the React code samples.


## Server Side Rendering
Right now server side rendering is possible with a few caveats.

**Caveats**

1. You must download the datafile manually and pass in via the `datafile` option.  Can not use `sdkKey` to automatically download.

2. Rendering of components must be completely synchronous (this is true for all server side rendering)

### Setting up `<OptimizelyProvider>`

Similar to browser side rendering you will need to wrap your app (or portion of the app using Optimizely) in the `<OptimizelyProvider>` component.  A new prop
`isServerSide` must be equal to true.

```jsx
<OptimizelyProvider optimizely={optimizely} user={{id: "user1"}} isServerSide={true}>
  <App />
</OptimizelyProvider>
```

All other Optimizely components, such as `<OptimizelyFeature>` and `<OptimizelyExperiment>` can remain the same.

### Full example

```jsx
import * as React from 'react'
import * as ReactDOMServer from 'react-dom/server'

import {
  createInstance,
  OptimizelyProvider,
  OptimizelyFeature,
  OptimizelyExperiment,
  OptimizelyVariation,
} from '@optimizely/react-sdk'

const fetch = require('node-fetch')

async function main() {
  const resp = await fetch(
    'https://cdn.optimizely.com/datafiles/<Your-SDK-Key>.json',
  )
  const datafile = await resp.json()
  const optimizely = createInstance({
    datafile,
  })

  const output = ReactDOMServer.renderToString(
    <OptimizelyProvider optimizely={optimizely} user={{id: "user1"}} isServerSide={true}>
      <OptimizelyFeature feature="feature1">
        {featureEnabled => (featureEnabled ? <p>enabled</p> : <p>disabled</p>)}
      </OptimizelyFeature>

      <OptimizelyExperiment experiment="abtest1">
        <OptimizelyVariation variation="var1">
          <p>variation 1</p>
        </OptimizelyVariation>
        <OptimizelyVariation default>
          <p>default variation</p>
        </OptimizelyVariation>
      </OptimizelyExperiment>
    </OptimizelyProvider>,
  )
  console.log('output', output)
}
main()
```

## Disabled event dispatcher
To disable sending all events to Optimizely's results backend, use the `logOnlyEventDispatcher` when creating a client:
```js
import { createInstance, logOnlyEventDispatcher } from '@optimizely/react-sdk'

const optimizely = createInstance({
  datafile: window.datafile,
  eventDispatcher: logOnlyEventDispatcher,
})
```

# Credits

First-party code (under lib/ and dist/) is copyright Optimizely, Inc. and contributors, licensed under Apache 2.0.

# Additional code

Prod dependencies are as follows:

```json
{
  "@optimizely/js-sdk-datafile-manager@0.3.0": {
    "licenses": "Apache-2.0"
  },
  "@optimizely/js-sdk-event-processor@0.2.1": {
    "licenses": "MIT",
    "publisher": "Optimizely",
    "repository": "https://github.com/optimizely/javascript-sdk"
  },
  "@optimizely/js-sdk-logging@0.1.0": {
    "licenses": "MIT",
    "publisher": "Optimizely",
    "repository": "https://github.com/optimizely/javascript-sdk"
  },
  "@optimizely/js-sdk-utils@0.1.0": {
    "licenses": "MIT",
    "publisher": "Optimizely",
    "repository": "https://github.com/optimizely/javascript-sdk"
  },
  "@optimizely/optimizely-sdk@3.2.0": {
    "licenses": "Apache-2.0",
    "repository": "https://github.com/optimizely/javascript-sdk"
  },
  "hoist-non-react-statics@3.3.0": {
    "licenses": "BSD-3-Clause",
    "publisher": "Michael Ridgway",
    "repository": "https://github.com/mridgway/hoist-non-react-statics"
  },
  "js-tokens@4.0.0": {
    "licenses": "MIT",
    "publisher": "Simon Lydell",
    "repository": "https://github.com/lydell/js-tokens"
  },
  "json-schema@0.2.3": {
    "licenses": [
      "AFLv2.1",
      "BSD"
    ],
    "publisher": "Kris Zyp",
    "repository": "https://github.com/kriszyp/json-schema"
  },
  "lodash@4.17.11": {
    "licenses": "MIT",
    "publisher": "John-David Dalton",
    "repository": "https://github.com/lodash/lodash"
  },
  "loose-envify@1.4.0": {
    "licenses": "MIT",
    "publisher": "Andres Suarez",
    "repository": "https://github.com/zertosh/loose-envify"
  },
  "murmurhash@0.0.2": {
    "licenses": "MIT*",
    "repository": "https://github.com/perezd/node-murmurhash"
  },
  "object-assign@4.1.1": {
    "licenses": "MIT",
    "publisher": "Sindre Sorhus",
    "repository": "https://github.com/sindresorhus/object-assign"
  },
  "promise-polyfill@8.1.0": {
    "licenses": "MIT",
    "publisher": "Taylor Hakes",
    "repository": "https://github.com/taylorhakes/promise-polyfill"
  },
  "prop-types@15.7.2": {
    "licenses": "MIT",
    "repository": "https://github.com/facebook/prop-types"
  },
  "react-broadcast@0.7.1": {
    "licenses": "MIT",
    "publisher": "Michael Jackson",
    "repository": "https://github.com/ReactTraining/react-broadcast"
  },
  "react-is@16.8.6": {
    "licenses": "MIT",
    "repository": "https://github.com/facebook/react"
  },
  "react@16.8.6": {
    "licenses": "MIT",
    "repository": "https://github.com/facebook/react"
  },
  "scheduler@0.13.6": {
    "licenses": "MIT",
    "repository": "https://github.com/facebook/react"
  },
  "utility-types@2.1.0": {
    "licenses": "MIT",
    "publisher": "Piotr Witek",
    "repository": "https://github.com/piotrwitek/utility-types"
  },
  "uuid@3.3.2": {
    "licenses": "MIT",
    "repository": "https://github.com/kelektiv/node-uuid"
  },
  "warning@3.0.0": {
    "licenses": "BSD-3-Clause",
    "publisher": "Berkeley Martinez",
    "repository": "https://github.com/BerkeleyTrue/warning"
  }
}

```

To regenerate the dependencies, run the following command:

```sh
npx license-checker --production --json | jq 'map_values({ licenses, publisher, repository }) | del(.[][] | nulls)'
```

# Contribute to this repo

Please see [CONTRIBUTING](../../CONTRIBUTING.md) for more information.

