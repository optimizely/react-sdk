# Next.js Integration Guide

This guide covers how to use the Optimizely React SDK with Next.js for server-side rendering (SSR), static site generation (SSG), and React Server Components.

## Table of Contents

- [Prerequisites](#prerequisites)
- [SSR with Pre-fetched Datafile](#ssr-with-pre-fetched-datafile)
- [Next.js App Router](#nextjs-app-router)
  - [Create a datafile fetcher](#1-create-a-datafile-fetcher)
  - [Create a client-side provider](#2-create-a-client-side-provider)
    - [Module-level alternative](#module-level-alternative)
  - [Wire it up in your root layout](#3-wire-it-up-in-your-root-layout)
    - [Pre-fetching ODP audience segments](#pre-fetching-odp-audience-segments)
- [Next.js Pages Router](#nextjs-pages-router)
- [Using Feature Flags in Client Components](#using-feature-flags-in-client-components)
- [Static Site Generation (SSG)](#static-site-generation-ssg)
- [Limitations](#limitations)
  - [Datafile required for SSR](#datafile-required-for-ssr)
  - [User Promise not supported](#user-promise-not-supported)
  - [ODP audience segments](#odp-audience-segments)

## Prerequisites

Install the React SDK:

```bash
npm install @optimizely/react-sdk
```

You will need your Optimizely SDK key, available from the Optimizely app under **Settings > Environments**.

## SSR with Pre-fetched Datafile

Server-side rendering requires a pre-fetched datafile. The SDK cannot fetch the datafile asynchronously during server rendering, so you must fetch it beforehand and pass it to `createInstance`.

There are several ways to pre-fetch the datafile on the server. Below are two common approaches you could follow.

## Next.js App Router

In the App Router, fetch the datafile in an async server component (e.g., your root layout) and pass it as a prop to a client-side provider.

### 1. Create a datafile fetcher

**Option A: Using the SDK's built-in datafile fetching (Recommended)**

Create a module-level SDK instance with a polling config manager and use a notification listener to detect when the datafile is ready. This approach benefits from the SDK's built-in polling and caching, making it suitable when you want automatic datafile updates across requests.

```ts
// src/data/getDatafile.ts
import { createInstance, createPollingProjectConfigManager } from '@optimizely/react-sdk';

const pollingInstance = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY || '',
  }),
});

const configReady = new Promise<void>((resolve) => {
  pollingInstance.notificationCenter.addNotificationListener(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, () =>
    resolve()
  );
});

export function getDatafile(): Promise<string | undefined> {
  return configReady.then(() => pollingInstance.getOptimizelyConfig()?.getDatafile());
}
```

**Option B: Direct CDN fetch**

Fetch the datafile directly from CDN.

```ts
// src/data/getDatafile.ts
const CDN_URL = `https://cdn.optimizely.com/datafiles/${process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY}.json`;

export async function getDatafile() {
  const res = await fetch(CDN_URL);

  if (!res.ok) {
    throw new Error(`Failed to fetch datafile: ${res.status}`);
  }

  return res.json();
}
```

### 2. Create a client-side provider

Since `OptimizelyProvider` uses React Context (a client-side feature), it must be wrapped in a `'use client'` component:

```tsx
// src/providers/OptimizelyProvider.tsx
'use client';

import {
  OptimizelyProvider,
  createInstance,
  createStaticProjectConfigManager,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  OptimizelyDecideOption,
} from '@optimizely/react-sdk';
import { ReactNode, useState } from 'react';

export function OptimizelyClientProvider({ children, datafile }: { children: ReactNode; datafile: object }) {
  const isServerSide = typeof window === 'undefined';

  const [optimizely] = useState(() =>
    createInstance({
      projectConfigManager: isServerSide
        ? createStaticProjectConfigManager({ datafile })
        : createPollingProjectConfigManager({
            sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY || '',
            datafile,
          }),
      eventProcessor: isServerSide ? undefined : createBatchEventProcessor(),
      defaultDecideOptions: isServerSide ? [OptimizelyDecideOption.DISABLE_DECISION_EVENT] : [],
      disposable: isServerSide,
    })
  );

  return (
    <OptimizelyProvider client={optimizely} user={{ id: 'user123', attributes: { plan_type: 'premium' } }}>
      {children}
    </OptimizelyProvider>
  );
}
```

#### Module-level alternative

You can also create the client at module level to avoid recreating the instance on re-renders. The trade-off is that the datafile must be resolved before the provider module is evaluated. One approach is to use `globalThis` to bridge the datafile between server and client: the server fetches the datafile, sets it on `globalThis` for server rendering, and injects a `<script>` tag so the client has it at module evaluation time.

> **Note:** This is one approach to module-level client creation. Other strategies are also possible depending on your setup.

Both examples below reuse the `getDatafile` helper from [Option A](#1-create-a-datafile-fetcher) or [Option B](#1-create-a-datafile-fetcher) above.

**App Router (`layout.tsx`)**

The layout fetches the datafile, sets `globalThis` for the server render, and injects a `<script>` tag for the client.

```tsx
// src/app/layout.tsx
import { getDatafile } from '@/data/getDatafile';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const datafile = await getDatafile();
  // Set on globalThis so the provider module can read it during server rendering
  globalThis.__OPTIMIZELY_DATAFILE__ = datafile ?? '';

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `globalThis.__OPTIMIZELY_DATAFILE__ = ${datafile};`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Pages Router (`_document.tsx`)**

In the Pages Router, use `_document.tsx` for the same purpose — fetch the datafile in `getInitialProps`, set `globalThis` for the server render, and inject the `<script>` tag.

```tsx
// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { getDatafile } from '@/data/getDatafile';

export default function MyDocument({ datafile }: { datafile: string }) {
  return (
    <Html>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `globalThis.__OPTIMIZELY_DATAFILE__ = ${datafile};`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

MyDocument.getInitialProps = async (ctx) => {
  const initialProps = await Document.getInitialProps(ctx);
  const datafile = await getDatafile();
  globalThis.__OPTIMIZELY_DATAFILE__ = datafile;
  return { ...initialProps, datafile };
};
```

**Provider (module-level)**

With `globalThis.__OPTIMIZELY_DATAFILE__` available, the provider can create the client at module level with immediate datafile readiness:

```tsx
// src/providers/OptimizelyProvider.tsx
'use client';

import {
  OptimizelyProvider,
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
} from '@optimizely/react-sdk';
import { ReactNode } from 'react';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY || '',
    datafile: globalThis.__OPTIMIZELY_DATAFILE__,
  }),
  eventProcessor: createBatchEventProcessor(),
});

export function OptimizelyClientProvider({ children }: { children: ReactNode }) {
  return (
    <OptimizelyProvider client={optimizely} user={{ id: 'user123', attributes: { plan_type: 'premium' } }}>
      {children}
    </OptimizelyProvider>
  );
}
```

> See [Server-Side Rendering](../README.md#server-side-rendering) in the README for an explanation of each option.

### 3. Wire it up in your root layout

> If you are using the [module-level alternative](#module-level-alternative), the layout already handles datafile injection — just wrap `{children}` with `<OptimizelyClientProvider>` (no `datafile` prop needed).

```tsx
// src/app/layout.tsx
import { OptimizelyClientProvider } from '@/providers/OptimizelyProvider';
import { getDatafile } from '@/data/getDatafile';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const datafile = await getDatafile();

  return (
    <html lang="en">
      <body>
        <OptimizelyClientProvider datafile={datafile}>{children}</OptimizelyClientProvider>
      </body>
    </html>
  );
}
```

#### Pre-fetching ODP audience segments

If your project uses ODP audience segments, you can pre-fetch them server-side using `getQualifiedSegments` and pass them to the provider via the `qualifiedSegments` prop.

```tsx
// src/app/layout.tsx
import { getQualifiedSegments } from '@optimizely/react-sdk';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const datafile = await getDatafile();
  const { segments } = await getQualifiedSegments('user-123', datafile);

  return (
    <html lang="en">
      <body>
        <OptimizelyClientProvider datafile={datafile} qualifiedSegments={segments}>
          {children}
        </OptimizelyClientProvider>
      </body>
    </html>
  );
}
```

> **Caching recommendation:** The ODP segment fetch adds latency to initial page loads. Consider caching the result per user to avoid re-fetching on every request.

## Next.js Pages Router

In the Pages Router, fetch the datafile server-side and pass it as a prop. There are three data-fetching strategies depending on your needs.

### 1. Create a client-side provider

Same as the [App Router provider](#2-create-a-client-side-provider) above (without the `'use client'` directive, which is not needed in Pages Router).

### 2. Fetch the datafile

Choose the data-fetching strategy that best fits your use case:

#### Option A: `getInitialProps` — app-wide setup

Fetches the datafile for every page via `_app.tsx`. Useful when you want Optimizely available globally across all pages.

```tsx
// pages/_app.tsx
import { OptimizelyClientProvider } from '@/providers/OptimizelyProvider';
import type { AppProps, AppContext } from 'next/app';
import { getDatafile } from '@/data/getDatafile';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <OptimizelyClientProvider datafile={pageProps.datafile}>
      <Component {...pageProps} />
    </OptimizelyClientProvider>
  );
}

App.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const datafile = await getDatafile();
  return { ...appProps, pageProps: { ...appProps.pageProps, datafile } };
};
```

Similar to the App Router example, if you have ODP enabled and want to pre-fetch segments, you can do the following:

```tsx
import { getQualifiedSegments } from '@optimizely/react-sdk';

App.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const datafile = await getDatafile();
  const { segments } = await getQualifiedSegments('user-123', datafile);
  return { ...appProps, pageProps: { ...appProps.pageProps, datafile, segments } };
};
```

#### Option B: `getServerSideProps` — per-page setup

Fetches the datafile per request on specific pages. Useful when only certain pages need feature flags.

```tsx
// pages/index.tsx
export async function getServerSideProps() {
  const datafile = await getDatafile();

  return { props: { datafile } };
}
```

#### Option C: `getStaticProps` — static generation with revalidation

Fetches the datafile at build time and revalidates periodically. Best for static pages where per-request freshness is not critical.

```tsx
// pages/index.tsx
export async function getStaticProps() {
  const datafile = await getDatafile();

  return {
    props: { datafile },
    revalidate: 60, // re-fetch every 60 seconds
  };
}
```

## Using Feature Flags in Client Components

Once the provider is set up, use the `useDecide` hook in any client component:

```tsx
'use client';

import { useDecide } from '@optimizely/react-sdk';

export default function FeatureBanner() {
  const { decision, isLoading } = useDecide('banner-flag');

  if (isLoading) return <h1>Loading...</h1>;

  return decision.enabled ? <h1>New Banner</h1> : <h1>Default Banner</h1>;
}
```

## Static Site Generation (SSG)

For statically generated pages, the SDK cannot make decisions during the build because there is no per-user context at build time. Instead, use the SDK as a regular client-side React library — the static HTML serves a default or loading state, and decisions resolve on the client after hydration.

```tsx
'use client';
import { useState } from '@optimizely/react-sdk';
import {
  OptimizelyProvider,
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  useDecide,
} from '@optimizely/react-sdk';

export function App() {
  const [client] = useState(() =>
    createInstance({
      projectConfigManager: createPollingProjectConfigManager({ sdkKey: 'YOUR_SDK_KEY' }),
      eventProcessor: createBatchEventProcessor(),
    })
  );

  return (
    <OptimizelyProvider client={optimizely} user={{ id: 'user123' }}>
      <FeatureBanner />
    </OptimizelyProvider>
  );
}

function FeatureBanner() {
  const { decision, isLoading } = useDecide('banner-flag');

  if (isLoading) return <h1>Loading...</h1>;

  return decision.enabled ? <h1>New Banner</h1> : <h1>Default Banner</h1>;
}
```

## Limitations

### Datafile required for SSR

SSR with `sdkKey` alone (without a pre-fetched datafile) is **not supported** because it requires an asynchronous network call that cannot complete during synchronous server rendering. If no datafile is provided, decisions will fall back to defaults.

To handle this gracefully, render a loading state and let the client hydrate with the real decision:

```tsx
'use client';

import { useDecide } from '@optimizely/react-sdk';

export default function MyFeature() {
  const { decision, isLoading } = useDecide('flag-1');

  if (isLoading) return <h1>Loading...</h1>;

  return decision.enabled ? <h1>Feature Enabled</h1> : <h1>Feature Disabled</h1>;
}
```

### User Promise not supported

User `Promise` is not supported. You must provide a resolved user object to `OptimizelyProvider`. If user information must be fetched asynchronously, resolve the promise before rendering the Provider:

```tsx
// Supported
<OptimizelyProvider client={optimizely} user={{ id: 'user123', attributes: { plan: 'premium' } }} />

// NOT supported
<OptimizelyProvider client={optimizely} user={fetchUserPromise} />
```

### ODP audience segments

ODP (Optimizely Data Platform) audience segments require fetching segment data via an async network call, which is not available during server rendering. To include segment data during SSR, pass pre-fetched segments via the `qualifiedSegments` prop on `OptimizelyProvider`:

```tsx
<OptimizelyProvider
  client={optimizely}
  user={{ id: 'user123' }}
  qualifiedSegments={['segment1', 'segment2']}
  skipSegments={true}
>
  {children}
</OptimizelyProvider>
```

This enables synchronous ODP-based decisions during server rendering. If `qualifiedSegments` is not provided, decisions will be made without audience segment data — in that case, consider deferring the decision to the client using the loading state fallback pattern described above, where ODP segments are fetched automatically when ODP is enabled via `createOdpManager`.
