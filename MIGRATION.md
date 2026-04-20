# Migrating to React SDK v4

This guide covers breaking changes and how to update your code when upgrading from React SDK v3 to v4.

- [Architecture changes](#architecture-changes)
- [Installation](#installation)
- [Underlying JS SDK changes (v5 to v6)](#underlying-js-sdk-changes-v5-to-v6)
- [Client creation](#client-creation)
- [Provider](#provider)
- [Hooks](#hooks)
  - [useDecision to useDecide](#usedecision-to-usedecide)
  - [useExperiment (removed)](#useexperiment-removed)
  - [useFeature (removed)](#usefeature-removed)
  - [useTrackEvent (removed)](#usetrackEvent-removed)
  - [New hooks](#new-hooks)
- [Accessing the client directly](#accessing-the-client-directly)
- [Removed APIs](#removed-apis)
- [Event tracking](#event-tracking)
- [Forced decisions](#forced-decisions)
- [Logger](#logger)
- [Server-side rendering](#server-side-rendering)
- [React Server Components](#react-server-components)
- [TypeScript changes](#typescript-changes)

---

## Architecture changes

v4 is a ground-up rewrite with a fundamentally different architecture:

| Aspect | v3 | v4 |
|--------|----|----|
| Underlying JS SDK | v5 (`@optimizely/optimizely-sdk`) | v6 (`@optimizely/optimizely-sdk`) |
| Client model | Stateful `ReactSDKClient` wrapper (user bound to client) | Thin wrapper over the JS SDK `Client` (user managed by Provider) |
| Readiness model | `[value, clientReady, didTimeout]` tuples | `{ decision, isLoading, error }` discriminated unions |
| Datafile updates | `autoUpdate` option per hook | Automatic via SDK polling; hooks re-evaluate on config changes |
| User overrides | Per-hook `overrideUserId` / `overrideAttributes` | Removed; use separate `<OptimizelyProvider>` instances |
| Components | `OptimizelyExperiment`, `OptimizelyFeature`, `OptimizelyVariation` | Removed; use hooks |
| HOC | `withOptimizely` | Removed; use hooks |

---

## Underlying JS SDK changes (v5 to v6)

React SDK v4 upgrades the underlying `@optimizely/optimizely-sdk` from v5 to v6. This brings several behavioral changes that affect React SDK usage. For full details, see the [JavaScript SDK Migration Guide](https://github.com/optimizely/javascript-sdk/blob/master/MIGRATION.md).

### Modular architecture

The monolithic `createInstance` config is now split into dedicated factory functions. Options like `sdkKey`, `datafile`, event batching, ODP, and logging are no longer top-level — each has its own factory. See [Client creation](#client-creation) for details.

### Opt-in components

Several features that were enabled by default in v5 are now opt-in in v6:

| Component | v5 (v3 React SDK) | v6 (v4 React SDK) |
|-----------|-------------------|-------------------|
| Event processing | Enabled by default (batch processor) | **Opt-in** — pass `eventProcessor` to `createInstance`, otherwise no events are dispatched |
| ODP | Enabled by default (configured via `odpOptions`) | **Opt-in** — pass `odpManager` to `createInstance`, otherwise ODP is disabled |
| VUID tracking | Enabled by default | **Opt-in** — pass `vuidManager` to `createInstance` |
| Logging | Enabled by default | **Opt-in** — pass `logger` to `createInstance`, otherwise logging is disabled |

### `onReady` behavior

In v5, `onReady()` always fulfilled with `{ success: boolean, reason?: string }`. In v6, `onReady()` fulfills when the client is ready and rejects on failure:

```jsx
// v3
optimizely.onReady().then(({ success, reason }) => {
  if (success) { /* ready */ }
  else { console.log(reason); }
});

// v4
optimizely.onReady()
  .then(() => { /* ready */ })
  .catch((err) => { console.error(err); });
```

> **Note:** When using hooks (`useDecide`, etc.), you don't call `onReady` directly — the Provider and hooks handle readiness internally. This change primarily affects direct client usage in server components or outside the Provider.

### `createInstance` error handling

In v3, `createInstance` returned `null` on invalid config. In v4, it throws an error. Wrap the call in a try/catch if you need to handle invalid configurations.

---

## Client creation

### v3

```jsx
import { createInstance } from '@optimizely/react-sdk';

const optimizely = createInstance({
  sdkKey: 'your-sdk-key',
  datafile: window.optimizelyDatafile,
  // v3-specific options
  eventBatchSize: 10,
  eventFlushInterval: 2000,
});
```

`createInstance` returned a `ReactSDKClient` — a custom wrapper around the JS SDK with user management, readiness tracking, and React-specific methods.

### v4

In v4, the `Config` type is modular. Options like `sdkKey`, `datafile`, and event batching are no longer top-level — they are configured through dedicated factory functions. The only required field is `projectConfigManager`.

```jsx
import {
  createInstance,
  createPollingProjectConfigManager,
} from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: 'your-sdk-key',
    datafile: window.optimizelyDatafile, // optional: use as initial datafile while polling for updates
    autoUpdate: true,
  }),
});
```

`createInstance` from `@optimizely/react-sdk` returns a JS SDK v6 `Client` augmented with React-specific metadata. The client no longer holds user state — that responsibility moves to `<OptimizelyProvider>`.

> **Important:** You must use `createInstance` from `@optimizely/react-sdk`, not from `@optimizely/optimizely-sdk`. A client created directly from the JS SDK will not work correctly with `<OptimizelyProvider>` and hooks.

**Key differences:**
- `sdkKey` and `datafile` are passed to a config manager factory, not to `createInstance` directly.
- You can no longer call `optimizely.setUser()` or other v3-specific wrapper methods on the returned client. Use hooks or the JS SDK client API instead.

### Config manager factories

| Factory | Use case |
|---------|----------|
| `createPollingProjectConfigManager()` | Fetches and polls for datafile updates. `sdkKey` is required. |
| `createStaticProjectConfigManager()` | Uses a fixed datafile with no polling. |

### Event processor factories

| Factory | Use case |
|---------|----------|
| `createBatchEventProcessor()` | Batches events before dispatching. |
| `createForwardingEventProcessor()` | Forwards each event immediately. |

### Other configurable modules

| Factory | Use case |
|---------|----------|
| `createOdpManager()` | Enables ODP integration (audience segments, events). |
| `createVuidManager()` | Enables visitor UID tracking. |
| `createErrorNotifier()` | Configures error notification. |
| `createLogger({ logLevel })` | Creates a logger instance (see [Logger](#logger)). |

### Full example

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

---

## Provider

### v3

```jsx
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk';

const optimizely = createInstance({ sdkKey: 'your-sdk-key' });

// v3 Provider accepted ReactSDKClient as `optimizely` prop
<OptimizelyProvider
  optimizely={optimizely}
  user={{ id: 'user-123', attributes: { plan: 'gold' } }}
  timeout={500}
  isServerSide={false}
>
  <App />
</OptimizelyProvider>
```

v3 also supported deprecated `userId` and `userAttributes` props, and a `Promise<UserInfo>` for async user resolution.

### v4

```jsx
import { OptimizelyProvider, createInstance, createPollingProjectConfigManager } from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({ sdkKey: 'your-sdk-key' }),
});

// v4 Provider uses `client` prop (not `optimizely`)
<OptimizelyProvider
  client={optimizely}
  user={{ id: 'user-123', attributes: { plan: 'gold' } }}
  timeout={500}
>
  <App />
</OptimizelyProvider>
```

### Prop changes

| v3 Prop | v4 Prop | Notes |
|---------|---------|-------|
| `optimizely` | `client` | Renamed. Now accepts a JS SDK `Client` (from `createInstance`). |
| `user` | `user` | Same shape `{ id, attributes }`. **No longer accepts a `Promise`**. |
| `timeout` | `timeout` | Default changed from `5000` ms to `30000` ms. |
| `isServerSide` | _(removed)_ | No longer needed. v4 hooks return decisions synchronously whenever both user context and config are available, regardless of environment. |
| `userId` | _(removed)_ | Deprecated in v3, removed in v4. Use `user` instead. |
| `userAttributes` | _(removed)_ | Deprecated in v3, removed in v4. Use `user` instead. |
| _(new)_ | `skipSegments` | Skips ODP segment fetching. Default `false`. |
| `qualifiedSegments` | `qualifiedSegments` | Pre-fetched ODP segments for the user. Same behavior in both versions. |

### Async user loading

v3 allowed passing a `Promise<UserInfo>` to the `user` prop. In v4, resolve the user before rendering the Provider:

```jsx
// v3
const userPromise = fetchUser();
<OptimizelyProvider optimizely={optimizely} user={userPromise}>

// v4 — resolve the user first
function AppWrapper() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  if (!user) return <LoadingSpinner />;

  return (
    <OptimizelyProvider client={optimizely} user={user}>
      <App />
    </OptimizelyProvider>
  );
}
```

---

## Hooks

### `useDecision` to `useDecide`

The primary decision hook has been renamed and its signature changed.

#### v3

```jsx
import { useDecision } from '@optimizely/react-sdk';

const [decision, clientReady, didTimeout] = useDecision(
  'flag-key',
  { autoUpdate: true, timeout: 500, decideOptions: [OptimizelyDecideOption.INCLUDE_REASONS] },
  { overrideUserId: 'other-user', overrideAttributes: { plan: 'gold' } }
);

if (!clientReady) return <Loading />;
if (decision.enabled) return <NewFeature />;
```

#### v4

```jsx
import { useDecide } from '@optimizely/react-sdk';

const { decision, isLoading, error } = useDecide(
  'flag-key',
  { decideOptions: [OptimizelyDecideOption.INCLUDE_REASONS] }
);

if (isLoading) return <Loading />;
if (error) return <Error error={error} />;
if (decision.enabled) return <NewFeature />;
```

**What changed:**

| Aspect | v3 `useDecision` | v4 `useDecide` |
|--------|-------------------|----------------|
| Import name | `useDecision` | `useDecide` |
| Return type | `[decision, clientReady, didTimeout]` tuple | `{ decision, isLoading, error }` object |
| `autoUpdate` option | Per-hook opt-in | Removed; updates are automatic via SDK polling |
| `timeout` option | Per-hook override | Removed; set on `<OptimizelyProvider>` only |
| `overrideUserId` | Third argument | Removed |
| `overrideAttributes` | Third argument | Removed |
| Error handling | Check `decision` for failed state | Explicit `error` property |
| Loading state | `!clientReady` | `isLoading: true` |
| Decision type when loading | Failed `OptimizelyDecision` object | `null` |

### `useExperiment` (removed)

`useExperiment` is removed in v4 with no hook replacement. For programmatic access, `client.activate()` is still available on the client. If hook-level reactivity for experiments is needed, consider staying on v3 for those components.

### `useFeature` (removed)

`useFeature` is removed in v4 with no hook replacement. For programmatic access, `client.isFeatureEnabled()` is still available on the client. If hook-level reactivity for feature flags is needed, consider staying on v3 for those components.

### `useTrackEvent` (removed)

`useTrackEvent` is removed in v4. Use `useOptimizelyUserContext` to track events:

```jsx
const { userContext } = useOptimizelyUserContext();

const handleClick = () => {
  if (userContext) {
    userContext.trackEvent('my-event', { revenue: 100 });
  }
};
```

### New hooks

v4 introduces several new hooks:

| Hook | Description |
|------|-------------|
| `useDecide(flagKey, config?)` | Single flag decision (replaces `useDecision`) |
| `useDecideForKeys(flagKeys[], config?)` | Batch decisions for multiple flag keys |
| `useDecideAll(config?)` | Decisions for all active flags |
| `useDecideAsync(flagKey, config?)` | Async variant of `useDecide` |
| `useDecideForKeysAsync(flagKeys[], config?)` | Async variant of `useDecideForKeys` |
| `useDecideAllAsync(config?)` | Async variant of `useDecideAll` |
| `useOptimizelyClient()` | Returns the Optimizely `Client` instance from context |
| `useOptimizelyUserContext()` | Returns `{ userContext, isLoading, error }` |

#### Multi-flag decisions

```jsx
import { useDecideForKeys } from '@optimizely/react-sdk';

const { decisions, isLoading, error } = useDecideForKeys(['flag-a', 'flag-b']);

if (!isLoading) {
  const flagA = decisions['flag-a'];
  const flagB = decisions['flag-b'];
}
```

#### Async decisions

```jsx
import { useDecideAsync } from '@optimizely/react-sdk';

const { decision, isLoading, error } = useDecideAsync('flag-key');
```

Async hooks call the underlying async SDK methods (`decideAsync`, `decideForKeysAsync`, `decideAllAsync`). Use these when your setup involves asynchronous operations such as CMAB (Contextual Multi-Armed Bandit) decisions or async User Profile Service lookups.

---

## Accessing the client directly

### v3 — `withOptimizely` HOC or `OptimizelyContext`

```jsx
import { withOptimizely } from '@optimizely/react-sdk';

class MyComponent extends React.Component {
  render() {
    const { optimizely } = this.props;
    const decision = optimizely.decide('flag-key');
    return <div>{decision.enabled ? 'On' : 'Off'}</div>;
  }
}

export default withOptimizely(MyComponent);
```

### v4 — `useOptimizelyClient` hook

```jsx
import { useOptimizelyClient } from '@optimizely/react-sdk';

function MyComponent() {
  const client = useOptimizelyClient();
}
```

---

## Removed APIs

The following v3 exports are removed in v4:

### Components
- `OptimizelyExperiment` — Removed along with its underlying `useExperiment` hook.
- `OptimizelyFeature` — Removed along with its underlying `useFeature` hook.
- `OptimizelyVariation` — Removed as it was only used as a child of `OptimizelyExperiment`.

### HOC
- `withOptimizely` — Use `useOptimizelyClient` hook instead.

### Hooks
- `useExperiment` — Removed with no hook replacement. Use `client.activate()` for programmatic access.
- `useFeature` — Removed with no hook replacement. Use `client.isFeatureEnabled()` for programmatic access.
- `useDecision` — Renamed to `useDecide` with a new return type.
- `useTrackEvent` — Use `useOptimizelyUserContext` instead.

### Client methods

Methods like `activate()`, `getVariation()`, `isFeatureEnabled()`, `getFeatureVariables()`, `getEnabledFeatures()`, `setForcedVariation()`, `getForcedVariation()`, and `track()` are still available on the client. As user is now decoupled from the client in v4, `userId` is a required parameter on all these methods.

The following v3-specific wrapper methods are removed:
- `setUser()` / `onUserUpdate()` — User is managed by `<OptimizelyProvider>` props.

### Utilities
- `logOnlyEventDispatcher` — To disable event dispatching, simply don't pass an `eventProcessor` to `createInstance` (event processing is opt-in in v4).
- `OptimizelyContext` (v3 context) — Use `useOptimizelyClient` or `useOptimizelyUserContext` hooks.

---

## Event tracking

### v3

```jsx
// Via useTrackEvent
const [track] = useTrackEvent();
track('purchase', undefined, undefined, { revenue: 4200 });

// Via withOptimizely
const { optimizely } = this.props;
optimizely.track('purchase');
```

### v4

```jsx
const { userContext } = useOptimizelyUserContext();
userContext?.trackEvent('purchase', { revenue: 4200 });
```

---

## Forced decisions

### v3

```jsx
const { optimizely } = this.props; // via withOptimizely
optimizely.setForcedDecision(
  { flagKey: 'flag-1', ruleKey: 'rule-1' },
  { variationKey: 'variation-a' }
);
```

### v4

Forced decisions are set on the `userContext` object:

```jsx
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
```

Hooks that use the affected flag key automatically re-render when forced decisions change.

---

## Logger

### v3

```jsx
import { createInstance, setLogLevel } from '@optimizely/react-sdk';

const optimizely = createInstance({
  sdkKey: 'your-sdk-key',
  logLevel: 'debug',
});
```

### v4

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

Logging is **disabled by default** in v4. You must pass a `logger` to `createInstance` to enable it. The `createLogger` function accepts a `logLevel` option, and the log level constants (`DEBUG`, `INFO`, `WARN`, `ERROR`) are exported for convenience.

---

## Server-side rendering

### v3

```jsx
<OptimizelyProvider
  optimizely={optimizely}
  user={{ id: 'user-123' }}
  isServerSide={true}
>
  <App />
</OptimizelyProvider>
```

### v4

The `isServerSide` prop is removed. Instead, configure the client for SSR use:

```jsx
import {
  createInstance,
  createStaticProjectConfigManager,
  createPollingProjectConfigManager,
  OptimizelyProvider,
  OptimizelyDecideOption,
} from '@optimizely/react-sdk';

const isServerSide = typeof window === 'undefined';

const optimizely = createInstance({
  projectConfigManager: isServerSide
    ? createStaticProjectConfigManager({ datafile }) // pre-fetched datafile, no polling
    : createPollingProjectConfigManager({
        sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY,
        datafile, // optional: use as initial datafile while polling
      }),
  defaultDecideOptions: isServerSide ? [OptimizelyDecideOption.DISABLE_DECISION_EVENT] : [],
});

<OptimizelyProvider
  client={optimizely}
  user={{ id: 'user-123' }}
>
  <App />
</OptimizelyProvider>
```

### ODP segments during SSR

ODP audience segments require async I/O, which is not available during synchronous server rendering. If your audience conditions depend on ODP segments, you can pre-fetch them server-side using `getQualifiedSegments` and pass them to the Provider.

`getQualifiedSegments` is available in both v3 and v4, but the return type has changed:

```ts
// v3
import { getQualifiedSegments } from '@optimizely/react-sdk';

const segments = await getQualifiedSegments(userId, datafile);
// segments: string[] | null

// v4
import { getQualifiedSegments } from '@optimizely/react-sdk';

const { segments, error } = await getQualifiedSegments(userId, datafile);
// returns QualifiedSegmentsResult { segments: string[], error: Error | null }
```

```jsx
// v3
<OptimizelyProvider
  optimizely={optimizely}
  user={{ id: 'user-123' }}
  qualifiedSegments={segments}
>
  <App />
</OptimizelyProvider>

// v4
<OptimizelyProvider
  client={optimizely}
  user={{ id: 'user-123' }}
  qualifiedSegments={segments}
  skipSegments={isServerSide}
>
  <App />
</OptimizelyProvider>
```

- `qualifiedSegments` — Pass pre-fetched segments so the Provider can create the user context synchronously with segments already set. Available in both v3 and v4.
- `skipSegments` — *(New in v4)* When `true`, skips the Provider's background ODP segment fetch. Use this on the server to avoid unnecessary async work.

---

## React Server Components

v4 provides a server-safe entry point via the `react-server` export condition in `package.json`. Frameworks that support this condition (e.g., Next.js App Router) automatically resolve `@optimizely/react-sdk` to the server entry point when importing from a Server Component. This entry point excludes hooks and Provider (which use client-only React APIs), so it is safe to import in server contexts.

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

---

## TypeScript changes

### Renamed / moved types

| v3 | v4 |
|----|----|
| `ReactSDKClient` | `Client` |

### New types

| Type | Description |
|------|-------------|
| `UseDecideConfig` | Config object for `useDecide` — `{ decideOptions?: OptimizelyDecideOption[] }` |
| `UseDecideResult` | Return type of `useDecide` — discriminated union of loading/error/success |
| `UseDecideMultiResult` | Return type of `useDecideForKeys` / `useDecideAll` |
| `OptimizelyProviderProps` | Props for `<OptimizelyProvider>` |
| `UserInfo` | `{ id?: string; attributes?: UserAttributes }` |
| `QualifiedSegmentsResult` | Return type of `getQualifiedSegments` — `{ segments: string[], error: Error \| null }` (replaces `string[] \| null` from v3) |

### Return type changes

v3 hooks returned positional tuples. v4 hooks return discriminated union objects:

```ts
// v3
type UseDecisionReturn = [OptimizelyDecision, boolean, boolean];

// v4
type UseDecideResult =
  | { isLoading: true;  error: null;  decision: null }
  | { isLoading: false; error: Error; decision: null }
  | { isLoading: false; error: null;  decision: OptimizelyDecision };
```

This pattern enables exhaustive narrowing:

```ts
const result = useDecide('flag');

if (result.isLoading) {
  // result.decision is null, result.error is null
}
if (result.error) {
  // result.decision is null, result.isLoading is false
}
// result.decision is OptimizelyDecision
```
