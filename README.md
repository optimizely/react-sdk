# Optimizely React SDK

This repository houses the React SDK for use with Optimizely Feature Experimentation and Optimizely Full Stack (legacy).

Optimizely Feature Experimentation is an A/B testing and feature management tool for product development teams that enables you to experiment at every step. Using Optimizely Feature Experimentation allows for every feature on your roadmap to be an opportunity to discover hidden insights. Learn more at [Optimizely.com](https://www.optimizely.com/products/experiment/feature-experimentation/), or see the [developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/introduction).

## Table of Contents

- [Get Started](#get-started)
- [Installation](#installation)
- [Quick Example](#quick-example)
- [Usage](#usage)
  - [Client Creation](#client-creation)
  - [`<OptimizelyProvider>`](#optimizelyprovider)
  - [Readiness](#readiness)
  - [Hooks](#hooks)
  - [Event Tracking](#event-tracking)
  - [Forced Decisions](#forced-decisions)
  - [Logging](#logging)
- [Server-Side Rendering](#server-side-rendering)
  - [`getQualifiedSegments`](#getqualifiedsegments)
  - [React Server Components](#react-server-components)
  - [Next.js Integration](#nextjs-integration)
  - [Limitations](#limitations)
- [Migrating from v3](#migrating-from-v3)
- [Additional Code](#additional-code)
- [Contributing](#contributing)

## Get Started

Refer to the [React SDK's developer documentation](https://docs.developers.optimizely.com/experimentation/v4.0.0-full-stack/docs/javascript-react-sdk) for detailed instructions on getting started with using the SDK.

For React Native, review the [React Native developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-react-native-sdk).

### Features

- Modular, tree-shakeable architecture built on the JS SDK v6
- Automatic datafile polling and hook re-evaluation on config changes
- User context managed by the Provider
- Async decision hooks for CMAB and async User Profile Service lookups
- Server-safe entry point for React Server Components
- Pre-built hooks for single-flag, multi-flag, and all-flag decisions

### Compatibility

| Requirement | Version |
| --- | --- |
| React | >= 16.8.0 |
| Node.js | >= 18.0.0 |
| Module format | ESM only |

## Installation

```
npm install @optimizely/react-sdk
```

For **React Native**, the installation is slightly different. Check out the:

- [Official Installation guide](https://docs.developers.optimizely.com/feature-experimentation/docs/install-sdk-reactnative)
- [Expo React Native Sample App](https://github.com/optimizely/expo-react-native-sdk-sample)

## Quick Example

```jsx
import {
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  OptimizelyProvider,
  useDecide,
} from '@optimizely/react-sdk';

const optimizelyClient = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: 'your-optimizely-sdk-key',
  }),
  eventProcessor: createBatchEventProcessor(),
});

function MyComponent() {
  const { decision, isLoading, error } = useDecide('sort-algorithm');

  if (isLoading || error) return null;

  return (
    <>
      {decision.variationKey === 'relevant_first' && <RelevantFirstList />}
      {decision.variationKey === 'recent_first' && <RecentFirstList />}
    </>
  );
}


function App() {
  return (
    <OptimizelyProvider
      client={optimizelyClient}
      timeout={500}
      user={{ id: window.userId, attributes: { plan_type: 'bronze' } }}
    >
      <MyComponent />
    </OptimizelyProvider>
  );
}
```

## Usage

### Client Creation

#### `createInstance`

Creates an Optimizely `Client` instance that powers the Provider and hooks. The client does not hold user state — user management is handled by `<OptimizelyProvider>`.

> **Important:** You must use `createInstance` from `@optimizely/react-sdk`, not from `@optimizely/optimizely-sdk`. A client created directly from the JS SDK will not work correctly with `<OptimizelyProvider>` and hooks.

_arguments_

- `config : object` — Configuration object with the following fields:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `projectConfigManager` | `OpaqueConfigManager` | Yes | Manages the datafile. Create with `createPollingProjectConfigManager` or `createStaticProjectConfigManager`. |
| `eventProcessor` | `OpaqueEventProcessor` | No | Processes and dispatches events. Create with `createBatchEventProcessor` or `createForwardingEventProcessor`. |
| `jsonSchemaValidator` | `{ validate(jsonObject: unknown): boolean }` | No | Custom validator for datafile schema validation. |
| `logger` | `OpaqueLogger` | No | Logger instance. Create with `createLogger`. |
| `errorNotifier` | `OpaqueErrorNotifier` | No | Error notification handler. Create with `createErrorNotifier`. |
| `userProfileService` | `UserProfileService` | No | Synchronous user profile service for sticky bucketing. |
| `userProfileServiceAsync` | `UserProfileServiceAsync` | No | Asynchronous user profile service for sticky bucketing. |
| `defaultDecideOptions` | `OptimizelyDecideOption[]` | No | Default options applied to all decide calls. |
| `clientEngine` | `string` | No | Custom client engine identifier. |
| `clientVersion` | `string` | No | Custom client version identifier. |
| `odpManager` | `OpaqueOdpManager` | No | ODP manager for audience segments and events. Create with `createOdpManager`. |
| `vuidManager` | `OpaqueVuidManager` | No | Visitor UID manager. Create with `createVuidManager`. |
| `disposable` | `boolean` | No | When `true`, marks the client as single-use for SSR. |
| `cmab` | `object` | No | CMAB cache configuration: `cacheSize` (number), `cacheTtl` (number, ms), `cache` (custom cache instance). |

> For detailed configuration options for each factory (polling intervals, custom event dispatchers, ODP, VUID etc.), see the [JavaScript SDK initialization guide](https://docs.developers.optimizely.com/feature-experimentation/docs/initialize-the-javascript-sdk).

_returns_

- A `Client` instance.

```jsx
import {
  createInstance,
  createPollingProjectConfigManager,
} from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: 'your-optimizely-sdk-key',
    datafile: window.optimizelyDatafile, // optional: use as initial datafile while polling
    autoUpdate: true,
  }),
});
```

#### Config manager factories

| Factory | Use case |
| --- | --- |
| `createPollingProjectConfigManager({ sdkKey, datafile?, autoUpdate? })` | Fetches and polls for datafile updates. `sdkKey` is required. |
| `createStaticProjectConfigManager({ datafile })` | Uses a fixed datafile with no polling. |

#### Event processor factories

| Factory | Use case |
| --- | --- |
| `createBatchEventProcessor({ batchSize?, flushInterval? })` | Batches events before dispatching. |
| `createForwardingEventProcessor()` | Forwards each event immediately. |

> **Note:** Event processing is opt-in. If no `eventProcessor` is passed to `createInstance`, no events are dispatched.

#### Other configurable modules

| Factory | Use case |
| --- | --- |
| `createOdpManager()` | Enables ODP integration (audience segments, events). |
| `createVuidManager()` | Enables visitor UID tracking. |
| `createErrorNotifier()` | Configures error notification. |
| `createLogger({ logLevel })` | Creates a logger instance (see [Logging](#logging)). |

#### Full client creation example

```jsx
import {
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  createOdpManager,
  createLogger,
  DEBUG,
} from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: 'your-sdk-key',
  }),
  eventProcessor: createBatchEventProcessor({
    batchSize: 10,
    flushInterval: 2000,
  }),
  odpManager: createOdpManager(),
  logger: createLogger({ logLevel: DEBUG }),
});
```

### `<OptimizelyProvider>`

Required at the root level. Leverages React's `Context` API to provide the Optimizely client and user context to hooks.

_props_

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `client` | `Client` | Yes | Instance created from `createInstance`. |
| `user` | `{ id?: string; attributes?: UserAttributes }` | No | User info object — `id` and `attributes` will be used to create the user context for all decisions and event tracking. |
| `timeout` | `number` | No | Maximum time (in milliseconds) to wait for the SDK to become ready before hooks resolve with a loading state. Default: `30000`. |
| `qualifiedSegments` | `string[]` | No | Pre-fetched ODP audience segments for the user. Use [`getQualifiedSegments`](#getqualifiedsegments) to obtain these segments server-side. |
| `skipSegments` | `boolean` | No | When `true`, skips background ODP segment fetching. Default: `false`. |

> **Note:** `<OptimizelyProvider>` requires user data. If user information must be fetched asynchronously, resolve the promise before rendering the Provider.

### Readiness

Before rendering real content, both the datafile and the user must be available to the SDK.

#### With datafile

Use `createStaticProjectConfigManager` to initialize with a pre-fetched datafile. The SDK is ready immediately with no network requests.

The `datafile` parameter accepts either a valid JSON string or a parsed datafile object.

```jsx
import {
  OptimizelyProvider,
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
} from '@optimizely/react-sdk';

// Using a JSON string (e.g., fetched server-side and injected into the page)
const optimizelyClient = createInstance({
  projectConfigManager: createStaticProjectConfigManager({
    datafile: '{"version": "4", "flags": ...}',
  }),
  eventProcessor: createForwardingEventProcessor(),
});

// Using a parsed object
const optimizelyClient = createInstance({
  projectConfigManager: createStaticProjectConfigManager({
    datafile: {"version": "4", "flags": ...},
  }),
  eventProcessor: createForwardingEventProcessor(),
});

function AppWrapper() {
  return (
    <OptimizelyProvider client={optimizelyClient} user={{ id: window.userId }}>
      <App />
    </OptimizelyProvider>
  );
}
```

#### With SDK key

Use `createPollingProjectConfigManager` with an `sdkKey` to have the SDK fetch and poll for the datafile. Provide a `timeout` option to `<OptimizelyProvider>` so hooks can distinguish between the loading state and actual decisions. Hooks return `isLoading: true` while waiting and resolve once the SDK is ready or the timeout expires.

```jsx
import {
  OptimizelyProvider,
  createInstance,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  useDecide,
} from '@optimizely/react-sdk';

const optimizelyClient = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: 'your-optimizely-sdk-key',
  }),
  eventProcessor: createForwardingEventProcessor(),
});

function MyComponent() {
  const { decision, isLoading, error } = useDecide('the-flag');

  if (isLoading) return null;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{decision.enabled ? 'Feature On' : 'Feature Off'}</div>;
}

function App() {
  return (
    <OptimizelyProvider
      client={optimizelyClient}
      timeout={500}
      user={{ id: window.userId, attributes: { plan_type: 'bronze' } }}
    >
      <MyComponent />
    </OptimizelyProvider>
  );
}
```

#### With both SDK key and datafile

You can provide both an `sdkKey` and a `datafile` to `createPollingProjectConfigManager`. The SDK uses the given datafile immediately, then fetches and polls for updates in the background.

```jsx
import {
  OptimizelyProvider,
  createInstance,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
} from '@optimizely/react-sdk';

const optimizelyClient = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: 'your-optimizely-sdk-key',
    datafile: window.optimizelyDatafile,
  }),
  eventProcessor: createForwardingEventProcessor(),
});

function AppWrapper() {
  return (
    <OptimizelyProvider client={optimizelyClient} user={{ id: window.userId }}>
      <App />
    </OptimizelyProvider>
  );
}
```

### Hooks

#### `useDecide`

The primary hook for retrieving a feature flag decision. Automatically re-evaluates when the underlying datafile changes.

_arguments_

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `flagKey` | `string` | Yes | The key of the feature flag. |
| `config` | `object` | No | Configuration object. |
| `config.decideOptions` | `OptimizelyDecideOption[]` | No | Array of decide options. |

_returns_ `{ decision, isLoading, error }`

| Field | Type | Description |
| --- | --- | --- |
| `decision` | `OptimizelyDecision \| null` | The decision result. `null` while loading or on error. |
| `isLoading` | `boolean` | `true` while waiting for the SDK to become ready. |
| `error` | `Error \| null` | Error object if the decision failed, otherwise `null`. |

```jsx
import { useDecide } from '@optimizely/react-sdk';

function LoginComponent() {
  const { decision, isLoading, error } = useDecide('login-flag');

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return (
    <p>
      <a href={decision.enabled ? '/login-new' : '/login-default'}>Click to login</a>
    </p>
  );
}
```

#### `useDecideForKeys`

Retrieve decisions for multiple flag keys in a single call.

_arguments_

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `flagKeys` | `string[]` | Yes | Array of flag keys. |
| `config` | `object` | No | Configuration object. |
| `config.decideOptions` | `OptimizelyDecideOption[]` | No | Array of decide options. |

_returns_ `{ decisions, isLoading, error }`

| Field | Type | Description |
| --- | --- | --- |
| `decisions` | `{ [key: string]: OptimizelyDecision } \| null` | Map of flag keys to their decisions. `null` while loading or on error. |
| `isLoading` | `boolean` | `true` while waiting for the SDK to become ready. |
| `error` | `Error \| null` | Error object if the decisions failed, otherwise `null`. |

```jsx
import { useDecideForKeys } from '@optimizely/react-sdk';

function Dashboard() {
  const { decisions, isLoading } = useDecideForKeys(['flag-a', 'flag-b']);

  if (isLoading) return <Loading />;

  return (
    <>
      {decisions['flag-a']?.enabled && <FeatureA />}
      {decisions['flag-b']?.enabled && <FeatureB />}
    </>
  );
}
```

#### `useDecideAll`

Retrieve decisions for all active (unarchived) flags.

_arguments_

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `config` | `object` | No | Configuration object. |
| `config.decideOptions` | `OptimizelyDecideOption[]` | No | Array of decide options. |

_returns_ `{ decisions, isLoading, error }`

| Field | Type | Description |
| --- | --- | --- |
| `decisions` | `{ [key: string]: OptimizelyDecision } \| null` | Map of flag keys to their decisions. `null` while loading or on error. |
| `isLoading` | `boolean` | `true` while waiting for the SDK to become ready. |
| `error` | `Error \| null` | Error object if the decisions failed, otherwise `null`. |

#### Async decision hooks

Async variants call the underlying async SDK methods (`decideAsync`, `decideForKeysAsync`, `decideAllAsync`). Use these when your setup involves asynchronous operations such as CMAB (Contextual Multi-Armed Bandit) decisions or async User Profile Service lookups.

| Hook | Description |
| --- | --- |
| `useDecideAsync(flagKey, config?)` | Async variant of `useDecide` |
| `useDecideForKeysAsync(flagKeys[], config?)` | Async variant of `useDecideForKeys` |
| `useDecideAllAsync(config?)` | Async variant of `useDecideAll` |

These hooks have the same return types as their synchronous counterparts.

```jsx
import { useDecideAsync } from '@optimizely/react-sdk';

function MyComponent() {
  const { decision, isLoading, error } = useDecideAsync('flag-key');

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return decision.enabled ? <NewFeature /> : <Default />;
}
```

#### `useOptimizelyClient`

Returns the Optimizely `Client` instance from context for direct SDK access.

```jsx
import { useOptimizelyClient } from '@optimizely/react-sdk';

function MyComponent() {
  const client = useOptimizelyClient();
  // Use client methods directly
}
```

#### `useOptimizelyUserContext`

Returns the current user context, which can be used for event tracking and forced decisions.

_returns_

- `{ userContext, isLoading, error }` — Where `userContext` is an Optimizely `UserContext` object.

```jsx
import { useOptimizelyUserContext } from '@optimizely/react-sdk';

function MyComponent() {
  const { userContext } = useOptimizelyUserContext();

  const handleClick = () => {
    userContext?.trackEvent('button-clicked', { revenue: 100 });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Event Tracking

Use the `useOptimizelyUserContext` hook to track events:

```jsx
import { useOptimizelyUserContext } from '@optimizely/react-sdk';

function SignupButton() {
  const { userContext } = useOptimizelyUserContext();

  const handleClick = () => {
    userContext?.trackEvent('signup-clicked');
  };

  return <button onClick={handleClick}>Signup</button>;
}
```

### Forced Decisions

Forced decisions are set on the `userContext` object:

```jsx
import { useOptimizelyUserContext } from '@optimizely/react-sdk';

function MyComponent() {
  const { userContext } = useOptimizelyUserContext();

  // Set a forced decision
  userContext?.setForcedDecision(
    { flagKey: 'flag-1', ruleKey: 'rule-1' },
    { variationKey: 'variation-a' }
  );

  // Remove a forced decision
  userContext?.removeForcedDecision({ flagKey: 'flag-1', ruleKey: 'rule-1' });

  // Remove all forced decisions
  userContext?.removeAllForcedDecisions();
}
```

Hooks that use the affected flag key automatically re-render when forced decisions change.

### Logging

Logging is disabled by default. Pass a `logger` to `createInstance` to enable it:

```jsx
import {
  createInstance,
  createPollingProjectConfigManager,
  createLogger,
  DEBUG,
} from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({ sdkKey: 'your-sdk-key' }),
  logger: createLogger({ logLevel: DEBUG }),
});
```

Log level constants `DEBUG`, `INFO`, `WARN`, and `ERROR` are exported for convenience.

## Server-Side Rendering

The React SDK supports server-side rendering (SSR). A pre-fetched datafile is required for SSR — without one, the SDK cannot make decisions during server rendering.

#### Per-request client

Create a client inside the component with `createStaticProjectConfigManager` and a pre-fetched datafile. Use `useMemo` to avoid recreating the instance on re-renders, and `disposable: true` so the instance can be garbage collected without explicitly calling `close()`.

```jsx
import { useMemo } from 'react';
import {
  createInstance,
  createStaticProjectConfigManager,
  OptimizelyProvider,
  useDecide,
} from '@optimizely/react-sdk';

export default function Page({ datafile, userId }) {
  const optimizely = useMemo(
    () =>
      createInstance({
        projectConfigManager: createStaticProjectConfigManager({ datafile }),
        disposable: true,
      }),
    [datafile]
  );

  return (
    <OptimizelyProvider client={optimizely} user={{ id: userId }}>
      <MyComponent />
    </OptimizelyProvider>
  );
}

function MyComponent() {
  const { decision, isLoading } = useDecide('flag1');
  if (isLoading) return null;
  return decision.enabled ? <p>Feature enabled</p> : <p>Feature disabled</p>;
}
```

#### Module-level client

For a long-lived server process, create a singleton client at the module level with `createPollingProjectConfigManager`. The client fetches and polls for datafile updates in the background.

Provide a datafile for immediate readiness. Without one, the server may render decisions once the initial fetch completes, but the client will not have the datafile yet (fetch still in-flight) and will render a loading or default state — causing a hydration mismatch.

If an `eventProcessor` is configured on the server, use `DISABLE_DECISION_EVENT` to avoid firing duplicate decision events (the client will fire them after hydration).

```jsx
import {
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  OptimizelyProvider,
  OptimizelyDecideOption,
  useDecide,
} from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY,
    datafile: preloadedDatafile,
  }),
  eventProcessor: createBatchEventProcessor(),
  defaultDecideOptions: [OptimizelyDecideOption.DISABLE_DECISION_EVENT],
});

function MyComponent() {
  const { decision, isLoading } = useDecide('flag1');
  if (isLoading) return null;
  return decision.enabled ? <p>Feature enabled</p> : <p>Feature disabled</p>;
}

function App() {
  return (
    <OptimizelyProvider client={optimizely} user={{ id: 'user1' }}>
      <MyComponent />
    </OptimizelyProvider>
  );
}
```

### `getQualifiedSegments`

A standalone async utility that fetches qualified ODP audience segments for a user, given a datafile. It parses the datafile to extract ODP configuration and segment conditions, queries the ODP GraphQL API, and returns only the segments where the user is qualified.

```ts
import { getQualifiedSegments } from '@optimizely/react-sdk';

const { segments, error } = await getQualifiedSegments(userId, datafile);
```

| Argument | Type | Description |
| --- | --- | --- |
| `userId` | `string` | The user ID to fetch qualified segments for |
| `datafile` | `string \| Record<string, any>` | The Optimizely datafile (JSON object or string) |

**Returns:** `Promise<QualifiedSegmentsResult>` — `{ segments: string[], error: Error | null }`

> **Caching recommendation:** The ODP segment fetch adds latency to server rendering. Consider caching the result per user to avoid re-fetching on every request.

Pass the pre-fetched segments to the Provider:

```jsx
<OptimizelyProvider
  client={optimizely}
  user={{ id: 'user-123' }}
  qualifiedSegments={segments}
  skipSegments={isServerSide}
>
  <App />
</OptimizelyProvider>
```

### React Server Components

The SDK provides a server-safe entry point via the `react-server` export condition. Frameworks that support this condition (e.g., Next.js App Router) automatically resolve `@optimizely/react-sdk` to the server entry point when importing from a Server Component. This entry point excludes hooks and Provider (which use client-only React APIs).

```tsx
import { createInstance, createStaticProjectConfigManager } from '@optimizely/react-sdk';

export default async function ServerComponent() {
  const client = createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile }),
  });

  await client.onReady();

  const userContext = client.createUserContext('user-123');
  const decision = userContext.decide('flag-key');

  client.close();

  return decision.enabled ? <NewFeature /> : <Default />;
}
```

### Next.js Integration

For detailed Next.js examples covering both App Router and Pages Router patterns, see the [Next.js Integration Guide](docs/nextjs-integration.md).

### Limitations

- **Datafile required** — SSR requires a pre-fetched datafile. Using `sdkKey` alone falls back to a failed decision.
- **ODP segments** — ODP audience segments require async I/O and are not available during server rendering. Use [`getQualifiedSegments`](#getqualifiedsegments) to pre-fetch segments server-side and pass them via the `qualifiedSegments` prop on `OptimizelyProvider`.

For more details and workarounds, see the [Next.js Integration Guide — Limitations](docs/nextjs-integration.md#limitations).

## Migrating from v3

For a comprehensive migration guide covering all breaking changes, see [MIGRATION.md](./MIGRATION.md).

## Rollout or Experiment a Feature User-by-User

To rollout or experiment on a feature by user rather than by random percentage, you will use Attributes and Audiences. To do this, follow the documentation on how to [run a beta](https://docs.developers.optimizely.com/feature-experimentation/docs/run-a-beta) using the React code samples.

## Additional Code

This repository includes the following third party open source code:

[**decompress-response**](https://github.com/sindresorhus/decompress-response)
Copyright &copy; Sindre Sorhus
License: [MIT](https://github.com/sindresorhus/decompress-response/blob/main/license)

[**js-tokens**](https://github.com/lydell/js-tokens)
Copyright &copy; Simon Lydell
License: [MIT](https://github.com/lydell/js-tokens/blob/master/LICENSE)

[**json-schema**](https://github.com/kriszyp/json-schema)
Copyright &copy; Kris Zyp
License: [AFL-2.1 OR BSD-3-Clause](https://github.com/kriszyp/json-schema/blob/master/LICENSE)

[**loose-envify**](https://github.com/zertosh/loose-envify)
Copyright &copy; Andres Suarez
License: [MIT](https://github.com/zertosh/loose-envify/blob/master/LICENSE)

[**mimic-response**](https://github.com/sindresorhus/mimic-response)
Copyright &copy; Sindre Sorhus
License: [MIT](https://github.com/sindresorhus/mimic-response/blob/main/license)

[**murmurhash**](https://github.com/perezd/node-murmurhash)
License: [MIT](https://github.com/perezd/node-murmurhash/blob/master/README.md)

[**react**](https://github.com/facebook/react)
Copyright &copy; Meta Platforms, Inc. and affiliates.
License: [MIT](https://github.com/facebook/react/blob/main/LICENSE)

[**tslib**](https://github.com/Microsoft/tslib)
Copyright &copy; Microsoft Corp.
License: [0BSD](https://github.com/nicolo-ribaudo/tslib/blob/main/LICENSE.txt)

[**use-sync-external-store**](https://github.com/facebook/react)
Copyright &copy; Meta Platforms, Inc. and affiliates.
License: [MIT](https://github.com/facebook/react/blob/main/LICENSE)

[**uuid**](https://github.com/uuidjs/uuid)
License: [MIT](https://github.com/uuidjs/uuid/blob/main/LICENSE.md)

To regenerate the dependencies used by this package, run the following command:

```sh
npx license-checker --production --json | jq 'map_values({ licenses, publisher, repository }) | del(.[][] | nulls)'
```

## Contributing

Please see [CONTRIBUTING](./CONTRIBUTING.md) for more information.

## Credits

First-party code subject to copyrights held by Optimizely, Inc. and its contributors and licensed to you under the terms of the Apache 2.0 license.

## Other Optimizely SDKs

- Agent - https://github.com/optimizely/agent
- Android - https://github.com/optimizely/android-sdk
- C# - https://github.com/optimizely/csharp-sdk
- Flutter - https://github.com/optimizely/optimizely-flutter-sdk
- Go - https://github.com/optimizely/go-sdk
- Java - https://github.com/optimizely/java-sdk
- JavaScript - https://github.com/optimizely/javascript-sdk
- PHP - https://github.com/optimizely/php-sdk
- Python - https://github.com/optimizely/python-sdk
- Ruby - https://github.com/optimizely/ruby-sdk
- Swift - https://github.com/optimizely/swift-sdk
