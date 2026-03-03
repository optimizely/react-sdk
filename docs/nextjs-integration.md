# Next.js Integration Guide

This guide covers how to use the Optimizely React SDK with Next.js for server-side rendering (SSR), static site generation (SSG), and React Server Components.

## Prerequisites

Install the React SDK:

```bash
npm install @optimizely/react-sdk
```

You will need your Optimizely SDK key, available from the Optimizely app under **Settings > Environments**.

## SSR with Pre-fetched Datafile

Server-side rendering requires a pre-fetched datafile. The SDK cannot fetch the datafile asynchronously during server rendering, so you must fetch it beforehand and pass it to `createInstance`.

There are many ways to pre-fetch the datafile on the server. Below are two common approaches you could follow.

## Next.js App Router

In the App Router, fetch the datafile in an async server component (e.g., your root layout) and pass it as a prop to a client-side provider.

### 1. Create a datafile fetcher

There are several ways to fetch the datafile. Here are two common approaches:

**Option A: Using the SDK's built-in datafile fetching (Recommended)**

Create an SDK instance with your `sdkKey` and let it fetch and cache the datafile internally. This approach benefits from the SDK's built-in polling and caching, making it suitable when you want automatic datafile updates across requests.

```ts
// src/data/getDatafile.ts
import { createInstance } from '@optimizely/react-sdk';

const pollingInstance = createInstance({
  sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY || "",
});

export async function getDatafile() {
  pollingInstance.setUser({
    id: "dummyUser",
  });
  await pollingInstance.onReady();
  return pollingInstance.getOptimizelyConfig()?.getDatafile();
}
```

**Option B: Direct CDN fetch**

Fetch the datafile directly from Optimizely's CDN. This is simpler and gives you full control over caching (e.g., via Next.js `fetch` options like `next.revalidate`), but does not include automatic polling for updates.

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

import { OptimizelyProvider, createInstance, OptimizelyDecideOption } from '@optimizely/react-sdk';
import { ReactNode, useState } from 'react';

export function OptimizelyClientProvider({ children, datafile }: { children: ReactNode; datafile: object }) {
    const isServerSide = typeof window === 'undefined';

    const [optimizely] = useState(() =>
    createInstance({
      datafile,
      sdkKey: process.env.NEXT_PUBLIC_OPTIMIZELY_SDK_KEY || '',
      datafileOptions: { autoUpdate: !isServerSide },
      defaultDecideOptions: isServerSide ? [OptimizelyDecideOption.DISABLE_DECISION_EVENT] : [],
      odpOptions: {
        disabled: isServerSide,
      },
    })
  );

  return (
    <OptimizelyProvider optimizely={optimizely} user={{ id: 'user123', attributes: { plan_type: 'premium' } }} isServerSide={isServerSide}>
      {children}
    </OptimizelyProvider>
  );
}
```

> See [Configuring the instance for server use](../README.md#configuring-the-instance-for-server-use) in the README for an explanation of each option.

### 3. Wire it up in your root layout

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

Once the provider is set up, use the `useDecision` hook in any client component:

```tsx
'use client';

import { useDecision } from '@optimizely/react-sdk';

export default function FeatureBanner() {
  const [decision] = useDecision('banner-flag');
  
  return decision.enabled ? <h1>New Banner</h1> : <h1>Default Banner</h1>;
}
```

## Static Site Generation (SSG)

For statically generated pages, the SDK cannot make decisions during the build because there is no per-user context at build time. Instead, use the SDK as a regular client-side React library — the static HTML serves a default or loading state, and decisions resolve on the client after hydration.

```tsx
'use client';

import { OptimizelyProvider, createInstance, useDecision } from '@optimizely/react-sdk';

const optimizely = createInstance({ sdkKey: 'YOUR_SDK_KEY' });

export function App() {
  return (
    <OptimizelyProvider optimizely={optimizely} user={{ id: 'user123' }}>
      <FeatureBanner />
    </OptimizelyProvider>
  );
}

function FeatureBanner() {
  const [decision, isClientReady, didTimeout] = useDecision('banner-flag');

  if (!isClientReady && !didTimeout) {
    return <h1>Loading...</h1>;
  }

  return decision.enabled ? <h1>New Banner</h1> : <h1>Default Banner</h1>;
}
```

## Limitations

### Datafile required for SSR

SSR with `sdkKey` alone (without a pre-fetched datafile) is **not supported** because it requires an asynchronous network call that cannot complete during synchronous server rendering. If no datafile is provided, decisions will fall back to defaults.

To handle this gracefully, render a loading state and let the client hydrate with the real decision:

```tsx
'use client';

import { useDecision } from '@optimizely/react-sdk';

export default function MyFeature() {
  const [decision, isClientReady, didTimeout] = useDecision('flag-1');

  if (!didTimeout && !isClientReady) {
    return <h1>Loading...</h1>;
  }

  return decision.enabled ? <h1>Feature Enabled</h1> : <h1>Feature Disabled</h1>;
}
```

### User Promise not supported

User `Promise` is not supported during SSR. You must provide a static user object to `OptimizelyProvider`:

```tsx
// Supported
<OptimizelyProvider user={{ id: 'user123', attributes: { plan: 'premium' } }} ... />

// NOT supported during SSR
<OptimizelyProvider user={fetchUserPromise} ... />
```

### ODP audience segments unavailable

ODP (Optimizely Data Platform) audience segments require fetching segment data via an async network call, which is not available during server rendering. Decisions will be made without audience segment data. If your experiment relies on ODP segments, consider using the loading state pattern above and deferring the decision to the client.
