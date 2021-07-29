# Optimizely React SDK

This repository houses the React SDK for use with Optimizely Full Stack and Optimizely Rollouts.

Optimizely Full Stack is A/B testing and feature flag management for product development teams. Experiment in any application. Make every feature on your roadmap an opportunity to learn. Learn more at https://www.optimizely.com/platform/full-stack/, or see the [documentation](https://docs.developers.optimizely.com/full-stack/docs).

Optimizely Rollouts is free feature flags for development teams. Easily roll out and roll back features in any application without code deploys. Mitigate risk for every feature on your roadmap. Learn more at https://www.optimizely.com/rollouts/, or see the [documentation](https://docs.developers.optimizely.com/rollouts/docs).

### Features

- Automatic datafile downloading
- User ID + attributes memoization
- Render blocking until datafile is ready via a React API
- Optimizely timeout (only block rendering up to the number of milliseconds you specify)
- Library of React components and hooks to use with [feature flags](https://docs.developers.optimizely.com/full-stack/v4.0/docs/create-feature-flags)

### Compatibility

The React SDK is compatible with `React 16.3.0 +`

### Example

```jsx
import {
  createInstance,
  OptimizelyProvider,
  useDecision,
} from '@optimizely/react-sdk';

const optimizelyClient = createInstance({
  sdkKey: 'your-optimizely-sdk-key',
});

function MyComponent() {
  const [decision] = useDecision('sort-algorithm');
  return (
    <React.Fragment>
      <SearchComponent algorithm={decision.variables.algorithm} />
      { decision.variationKey === 'relevant_first' && <RelevantFirstList /> }
      { decision.variationKey === 'recent_first' && <RecentFirstList /> }
    </React.Fragment>
  );
}

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider
        optimizely={optimizelyClient}
        timeout={500}
        user={{ id: window.userId, attributes: { plan_type: 'bronze' } }}
      >
        <MyComponent />
      </OptimizelyProvider>
    );
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

_arguments_

- `config : object` Object with SDK configuration parameters. This has the same format as the object passed to the `createInstance` method of the core `@optimizely/javascript-sdk` module. For details on this object, see the following pages from the developer docs:
  - [Instantiate](https://docs.developers.optimizely.com/full-stack/v4.0/docs/initialize-sdk-react)
  - [JavaScript: Client-side Datafile Management](https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-client-side-implementation)

_returns_

- A `ReactSDKClient` instance.

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk';

const optimizely = createInstance({
  datafile: window.datafile,
});
```

## `<OptimizelyProvider>`

Required at the root level. Leverages React’s `Context` API to allow access to the `ReactSDKClient` to the `useDecision` hook.

_props_

- `optimizely : ReactSDKClient` created from `createInstance`
- `user: { id: string; attributes?: { [key: string]: any } } | Promise` User info object - `id` and `attributes` will be passed to the SDK for every feature flag, A/B test, or `track` call, or a `Promise` for the same kind of object
- `timeout : Number` (optional) The amount of time for `useDecision` to return `null` flag Decision while waiting for the SDK instance to become ready, before resolving.
- `isServerSide : Boolean` (optional) must pass `true` here for server side rendering
- `userId : String` (optional) **_Deprecated, prefer using `user` instead_**. Another way to provide user id. The `user` object prop takes precedence when both are provided.
- `userAttributes : Object` : (optional) **_Deprecated, prefer using `user` instead_**. Another way to provide user attributes. The `user` object prop takes precedence when both are provided.

### Readiness

Before rendering real content, both the datafile and the user must be available to the SDK.

#### Load the datafile synchronously

Synchronous loading is the preferred method to ensure that Optimizely is always ready and doesn't add any delay or asynchronous complexity to your application. When initializing with both the SDK key and datafile, the SDK will use the given datafile to start, then download the latest version of the datafile in the background.

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk';

const optimizelyClient = createInstance({
  datafile: window.datafile,
  sdkKey: 'your-optimizely-sdk-key', // Optimizely environment key
});

class AppWrapper extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizelyClient} user={{ id: window.userId }}>
        <App />
      </OptimizelyProvider>
    );
  }
}
```

#### Load the datafile asynchronously

If you don't have the datafile downloaded, the `ReactSDKClient` can fetch the datafile for you. However, instead of waiting for the datafile to fetch before you render your app, you can immediately render your app and provide a `timeout` option to `<OptimizelyProvider optimizely={optimizely} timeout={200}>`. The `useDecision` hook returns `isClientReady` and `didTimeout`. You can use these to block rendering of component until the datafile loads or the timeout is over.

```jsx
import { OptimizelyProvider, createInstance, useDecision } from '@optimizely/react-sdk';

const optimizelyClient = createInstance({
  sdkKey: 'your-optimizely-sdk-key', // Optimizely environment key
});

function MyComponent() {
  const [decision, isClientReady, didTimeout] = useDecision('the-flag');
  return (
    <React.Fragment>
      { isClientReady && <div>The Component</div> }
      { didTimeout && <div>Default Component</div>}
      { /* If client is not ready and time out has not occured yet, do not render anything */ }
    </React.Fragment>
  );
}

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider
        optimizely={optimizelyClient}
        timeout={500}
        user={{ id: window.userId, attributes: { plan_type: 'bronze' } }}
      >
        <MyComponent />
      </OptimizelyProvider>
    );
  }
}
```

#### Set user asynchronously

If user information is synchronously available, it can be provided as the `user` object prop, as in prior examples. But, if user information must be fetched asynchronously, the `user` prop can be a `Promise` for a `user` object with the same properties (`id` and `attributes`):

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk';
import { fetchUser } from './user';

const optimizely = createInstance({
  datafile: window.datafile,
});

const userPromise = fetchUser(); // fetchUser returns a Promise for an object with { id, attributes }

class AppWrapper extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely} user={userPromise}>
        <App />
      </OptimizelyProvider>
    );
  }
}
```

## `useDecision` Hook

A [React Hook](https://reactjs.org/docs/hooks-intro.html) to retrieve the decision result for a flag key, optionally auto updating that decision based on underlying user or datafile changes.

_arguments_

- `flagKey : string` The key of the feature flag.
- `options : Object`
  - `autoUpdate : boolean` (optional) If true, this hook will update the flag decision in response to datafile or user changes. Default: `false`.
  - `timeout : number` (optional) Client timeout as described in the `OptimizelyProvider` section. Overrides any timeout set on the ancestor `OptimizelyProvider`.
  - `decideOption: OptimizelyDecideOption[]` (optional) Array of OptimizelyDecideOption enums.
- `overrides : Object`
  - `overrideUserId : string` (optional) Override the userId to be used to obtain the decision result for this hook.
  - `overrideAttributes : optimizely.UserAttributes` (optional) Override the user attributes to be used to obtain the decision result for this hook.

_returns_

- `Array` of:

  - `decision : OptimizelyDecision` - Decision result for the flag key.
  - `clientReady : boolean` - Whether or not the underlying `ReactSDKClient` instance is ready or not.
  - `didTimeout : boolean` - Whether or not the underlying `ReactSDKClient` became ready within the allowed `timeout` range.

  _Note: `clientReady` can be true even if `didTimeout` is also true. This indicates that the client became ready *after* the timeout period._

### Render something if flag is enabled

```jsx
import { useEffect } from 'react';
import { useDecision } from '@optimizely/react-sdk';

function LoginComponent() {
  const [decision, clientReady] = useDecision(
    'login-flag',
    { autoUpdate: true },
    {
      /* (Optional) User overrides */
    }
  );
  useEffect(() => {
    document.title = decision.enabled ? 'login-new' : 'login-default';
  }, [decision.enabled]);

  return (
    <p>
      <a href={decision.enabled ? '/login-new' : '/login-default'}>Click to login</a>
    </p>
  );
}
```

## `withOptimizely`

Any component under the `<OptimizelyProvider>` can access the Optimizely `ReactSDKClient` via the higher-order component (HoC) `withOptimizely`.

_arguments_

- `Component : React.Component` Component which will be enhanced with the following props:
  - `optimizely : ReactSDKClient` The client object which was passed to the `OptimizelyProvider`
  - `optimizelyReadyTimeout : number | undefined` The timeout which was passed to the `OptimizelyProvider`
  - `isServerSide : boolean` Value that was passed to the `OptimizelyProvider`

_returns_

- A wrapped component with additional props as described above

### Example

```jsx
import { withOptimizely } from '@optimizely/react-sdk';

class MyComp extends React.Component {
  constructor(props) {
    super(props);
    const { optimizely } = this.props;
    const decision = optimizely.decide('feat1');    

    this.state = {
      decision.enabled,
      decision.variables,
    };
  }

  render() {}
}

const WrappedMyComponent = withOptimizely(MyComp);
```

**_Note:_** The `optimizely` client object provided via `withOptimizely` is automatically associated with the `user` prop passed to the ancestor `OptimizelyProvider` - the `id` and `attributes` from that `user` object will be automatically forwarded to all appropriate SDK method calls. So, there is no need to pass the `userId` or `attributes` arguments when calling methods of the `optimizely` client object, unless you wish to use _different_ `userId` or `attributes` than those given to `OptimizelyProvider`.

### Tracking

Use the `withOptimizely` HoC for tracking.

```jsx
import { withOptimizely } from '@optimizely/react-sdk';

class SignupButton extends React.Component {
  onClick = () => {
    const { optimizely } = this.props;
    optimizely.track('signup-clicked');
    // rest of click handler
  };

  render() {
    <button onClick={this.onClick}>Signup</button>;
  }
}

const WrappedSignupButton = withOptimizely(SignupButton);
```

**_Note:_** As mentioned above, the `optimizely` client object provided via `withOptimizely` is automatically associated with the `user` prop passed to the ancestor `OptimizelyProvider.` There is no need to pass `userId` or `attributes` arguments when calling `track`, unless you wish to use _different_ `userId` or `attributes` than those given to `OptimizelyProvider`.

## `ReactSDKClient`

The following type definitions are used in the `ReactSDKClient` interface:

- `UserAttributes : { [name: string]: any }`
- `User : { id: string | null, attributes: userAttributes }`
- `VariableValuesObject : { [key: string]: any }`
- `EventTags : { [key: string]: string | number | boolean; }`

`ReactSDKClient` instances have the methods/properties listed below. Note that in general, the API largely matches that of the core `@optimizely/optimizely-sdk` client instance, which is documented on the [Optimizely X Full Stack developer docs site](https://docs.developers.optimizely.com/full-stack/docs). The major exception is that, for most methods, user id & attributes are **_optional_** arguments. `ReactSDKClient` has a current user. This user's id & attributes are automatically applied to all method calls, and overrides can be provided as arguments to these method calls if desired.

- `onReady(opts?: { timeout?: number }): Promise<onReadyResult>` Returns a Promise that fulfills with an `onReadyResult` object representing the initialization process. The instance is ready when it has fetched a datafile and a user is available (via `setUser` being called with an object, or a Promise passed to `setUser` becoming fulfilled). If the `timeout` period happens before the client instance is ready, the `onReadyResult` object will contain an additional key, `dataReadyPromise`, which can be used to determine when, if ever, the instance does become ready.
- `user: User` The current user associated with this client instance
- `setUser(userInfo: User | Promise<User>): void` Call this to update the current user
- `onUserUpdate(handler: (userInfo: User) => void): () => void` Subscribe a callback to be called when this instance's current user changes. Returns a function that will unsubscribe the callback.
- `decide(key: string, options?: optimizely.OptimizelyDecideOption[], overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): OptimizelyDecision` Returns a decision result for a flag key for a user. The decision result is returned in an OptimizelyDecision object, and contains all data required to deliver the flag rule.
- `decideAll(options?: optimizely.OptimizelyDecideOption[], overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): { [key: string]: OptimizelyDecision }` Returns decisions for all active (unarchived) flags for a user.
- `decideForKeys(keys: string[], options?: optimizely.OptimizelyDecideOption[], overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): { [key: string]: OptimizelyDecision }` Returns an object of decision results mapped by flag keys.
- `activate(experimentKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null` Activate an experiment, and return the variation for the given user.
- `getVariation(experimentKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null` Return the variation for the given experiment and user.
- `getFeatureVariables(featureKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): VariableValuesObject`: Decide and return variable values for the given feature and user <br /> <b>Warning:</b> Deprecated since 2.1.0 <br /> `getAllFeatureVariables` is added in JavaScript SDK which is similarly returning all the feature variables, but it sends only single notification of type `all-feature-variables` instead of sending for each variable. As `getFeatureVariables` was added when this functionality wasn't provided by `JavaScript SDK`, so there is no need of it now and it would be removed in next major release
- `getFeatureVariableString(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): string | null`: Decide and return the variable value for the given feature, variable, and user
- `getFeatureVariableInteger(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): number | null` Decide and return the variable value for the given feature, variable, and user
- `getFeatureVariableBoolean(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): boolean | null` Decide and return the variable value for the given feature, variable, and user
- `getFeatureVariableDouble(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): number | null` Decide and return the variable value for the given feature, variable, and user
- `isFeatureEnabled(featureKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): boolean` Return the enabled status for the given feature and user
- `getEnabledFeatures(overrideUserId?: string, overrideAttributes?: UserAttributes): Array<string>`: Return the keys of all features enabled for the given user
- `track(eventKey: string, overrideUserId?: string | EventTags, overrideAttributes?: UserAttributes, eventTags?: EventTags): void` Track an event to the Optimizely results backend
- `setForcedVariation(experiment: string, overrideUserIdOrVariationKey: string, variationKey?: string | null): boolean` Set a forced variation for the given experiment, variation, and user. **Note**: calling `setForcedVariation` on a given client will trigger a re-render of all `useExperiment` hooks and `OptimizelyExperiment` components that are using that client.
- `getForcedVariation(experiment: string, overrideUserId?: string): string | null` Get the forced variation for the given experiment, variation, and user

## Rollout or experiment a feature user-by-user

To rollout or experiment on a feature by user rather than by random percentage, you will use Attributes and Audiences. To do this, follow the documentation on how to [run a beta](https://docs.developers.optimizely.com/rollouts/docs/run-a-beta) using the React code samples.

## Server Side Rendering

Right now server side rendering is possible with a few caveats.

**Caveats**

1. You must download the datafile manually and pass in via the `datafile` option. Can not use `sdkKey` to automatically download.

2. Rendering of components must be completely synchronous (this is true for all server side rendering), thus the Optimizely SDK assumes that the optimizely client has been instantiated and fired it's `onReady` event already.

### Setting up `<OptimizelyProvider>`

Similar to browser side rendering you will need to wrap your app (or portion of the app using Optimizely) in the `<OptimizelyProvider>` component. A new prop
`isServerSide` must be equal to true.

```jsx
<OptimizelyProvider optimizely={optimizely} user={{ id: 'user1' }} isServerSide={true}>
  <App />
</OptimizelyProvider>
```

All other Optimizely components, such as `<OptimizelyFeature>` and `<OptimizelyExperiment>` can remain the same.

### Full example

```jsx
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import {
  createInstance,
  OptimizelyProvider,
  useDecision,
} from '@optimizely/react-sdk';

const fetch = require('node-fetch');

function MyComponent() {
  const [decision] = useDecision('flag1');
  return (
    <React.Fragment>
      { decision.enabled && <p>The feature is enabled</p> }
      { !decision.enabled && <p>The feature is not enabled</p> }
      { decision.variationKey === 'variation1' && <p>Variation 1</p> }
      { decision.variationKey === 'variation2' && <p>Variation 2</p> }
    </React.Fragment>
  );
}

async function main() {
  const resp = await fetch('https://cdn.optimizely.com/datafiles/<Your-SDK-Key>.json');
  const datafile = await resp.json();
  const optimizelyClient = createInstance({
    datafile,
  });

  const output = ReactDOMServer.renderToString(
    <OptimizelyProvider optimizely={optimizelyClient} user={{ id: 'user1' }} isServerSide={true}>
      <MyComponent />
    </OptimizelyProvider>
  );
  console.log('output', output);
}
main();
```

## Disabled event dispatcher

To disable sending all events to Optimizely's results backend, use the `logOnlyEventDispatcher` when creating a client:

```js
import { createInstance, logOnlyEventDispatcher } from '@optimizely/react-sdk';

const optimizely = createInstance({
  datafile: window.datafile,
  eventDispatcher: logOnlyEventDispatcher,
});
```

# Credits

First-party code subject to copyrights held by Optimizely, Inc. and its contributors and licensed to you under the terms of the Apache 2.0 license.

# Additional code

This repository includes the following third party open source code:

[**hoist-non-react-statics**](https://github.com/mridgway/hoist-non-react-statics)
Copyright &copy; 2015 Yahoo!, Inc.
License: [BSD](https://github.com/mridgway/hoist-non-react-statics/blob/master/LICENSE.md)

[**js-tokens**](https://github.com/lydell/js-tokens)
Copyright &copy; 2014, 2015, 2016, 2017, 2018, 2019 Simon Lydell
License: [MIT](https://github.com/lydell/js-tokens/blob/master/LICENSE)

[**json-schema**](https://github.com/kriszyp/json-schema)
Copyright &copy; 2005-2015, The Dojo Foundation
License: [BSD](https://github.com/kriszyp/json-schema/blob/master/LICENSE)

[**lodash**](https://github.com/lodash/lodash/)
Copyright &copy; JS Foundation and other contributors
License: [MIT](https://github.com/lodash/lodash/blob/master/LICENSE)

[**loose-envify**](https://github.com/zertosh/loose-envify)
Copyright &copy; 2015 Andres Suarez <zertosh@gmail.com>
License: [MIT](https://github.com/zertosh/loose-envify/blob/master/LICENSE)

[**node-murmurhash**](https://github.com/perezd/node-murmurhash)
Copyright &copy; 2012 Gary Court, Derek Perez
License: [MIT](https://github.com/perezd/node-murmurhash/blob/master/README.md)

[**object-assign**](https://github.com/sindresorhus/object-assign)
Copyright &copy; Sindre Sorhus (sindresorhus.com)
License: [MIT](https://github.com/sindresorhus/object-assign/blob/master/license)

[**promise-polyfill**](https://github.com/taylorhakes/promise-polyfill)
Copyright &copy; 2014 Taylor Hakes
Copyright &copy; 2014 Forbes Lindesay
License: [MIT](https://github.com/taylorhakes/promise-polyfill/blob/master/LICENSE)

[**prop-types**](https://github.com/facebook/prop-types)
Copyright &copy; 2013-present, Facebook, Inc.
License: [MIT](https://github.com/facebook/prop-types/blob/master/LICENSE)

[**react-is**](https://github.com/facebook/react)
Copyright &copy; Facebook, Inc. and its affiliates.
License: [MIT](https://github.com/facebook/react/blob/master/LICENSE)

[**react**](https://github.com/facebook/react)
Copyright &copy; Facebook, Inc. and its affiliates.
License: [MIT](https://github.com/facebook/react/blob/master/LICENSE)

[**scheduler**](https://github.com/facebook/react)
Copyright &copy; Facebook, Inc. and its affiliates.
License: [MIT](https://github.com/facebook/react/blob/master/LICENSE)

[**utility-types**](https://github.com/piotrwitek/utility-types)
Copyright &copy; 2016 Piotr Witek <piotrek.witek@gmail.com>
License: [MIT](https://github.com/piotrwitek/utility-types/blob/master/LICENSE)

[**node-uuid**](https://github.com/kelektiv/node-uuid)
Copyright &copy; 2010-2016 Robert Kieffer and other contributors
License: [MIT](https://github.com/kelektiv/node-uuid/blob/master/LICENSE.md)

To regenerate the dependencies use by this package, run the following command:

```sh
npx license-checker --production --json | jq 'map_values({ licenses, publisher, repository }) | del(.[][] | nulls)'
```

# Contribute to this repo

Please see [CONTRIBUTING](./CONTRIBUTING.md) for more information.
