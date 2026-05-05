# V4 Bug Bash — Next.js Test App Plan

## Overview

The React SDK v4 is a major rewrite (new hooks, new provider API, ESM-only, discriminated union returns, modular config). This bug bash app covers all SDK functionality across four testing dimensions:

1. **Native React SDK testing** — Provider behavior with different configurations
2. **SSR + CSR testing** — Server-side rendering with hooks
3. **RSC testing** — React Server Components with the server entry point
4. **Underlying functionality testing** — decide, holdout, async CMAB, async UPS, ODP, VUID

## Projects

Three real Optimizely projects, each with their own SDK key and datafile:

| Project | Purpose | SDK Key Env Var |
|---------|---------|-----------------|
| Basic + Holdout | Standard flags, holdout groups | `NEXT_PUBLIC_BASIC_SDK_KEY` |
| CMAB | Contextual Multi-Armed Bandit experiments | `NEXT_PUBLIC_CMAB_SDK_KEY` |
| ODP | ODP integration + segment audiences | `NEXT_PUBLIC_ODP_SDK_KEY` |

Exported datafiles are checked into `datafiles/basic.json`, `datafiles/cmab.json`, `datafiles/odp.json`.

---

## Tech Stack

- **Next.js 15** (App Router) — covers CSR, SSR, and RSC in a single project
- **React 19**
- **`@optimizely/react-sdk`** linked via `file:../../` (tests local build)
- **Playwright** for E2E — can verify server HTML before hydration, test loading states, inspect network calls
- **TypeScript**

---

## Directory Structure

```
examples/v4-bug-bash/
├── PLAN.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.local.example
├── playwright.config.ts
│
├── datafiles/
│   ├── basic.json
│   ├── cmab.json
│   └── odp.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (nav bar, no provider)
│   │   ├── page.tsx                # Dashboard — links to all scenarios
│   │   ├── globals.css
│   │   │
│   │   ├── provider/               # Provider behavior tests (10 pages)
│   │   │   ├── 01-user-datafile/page.tsx
│   │   │   ├── 02-user-datafile-sdkkey/page.tsx
│   │   │   ├── 03-user-sdkkey-only/page.tsx
│   │   │   ├── 04-odp-skip-segments/page.tsx
│   │   │   ├── 05-odp-qualified-segments/page.tsx
│   │   │   ├── 06-odp-fetch-segments/page.tsx
│   │   │   ├── 07-multiple-providers/page.tsx
│   │   │   ├── 08-forced-decision/page.tsx
│   │   │   ├── 09-module-level-client/page.tsx
│   │   │   └── 10-component-level-client/page.tsx
│   │   │
│   │   ├── hooks/                   # Hook functionality tests (12 pages)
│   │   │   ├── use-decide/page.tsx
│   │   │   ├── use-decide-holdout/page.tsx
│   │   │   ├── use-decide-odp-vuid/page.tsx
│   │   │   ├── use-decide-odp-no-vuid/page.tsx
│   │   │   ├── use-decide-for-keys/page.tsx
│   │   │   ├── use-decide-all/page.tsx
│   │   │   ├── use-decide-async-cmab/page.tsx
│   │   │   ├── use-decide-async-ups/page.tsx
│   │   │   ├── use-decide-for-keys-async/page.tsx
│   │   │   ├── use-decide-all-async/page.tsx
│   │   │   ├── use-client/page.tsx
│   │   │   └── use-user-context/page.tsx
│   │   │
│   │   └── rendering/              # SSR + RSC tests (3 pages)
│   │       ├── ssr-sync/
│   │       │   ├── page.tsx             # Server component — fetches datafile
│   │       │   └── SsrSyncClient.tsx    # Client component — provider + hooks
│   │       ├── ssr-async/
│   │       │   ├── page.tsx
│   │       │   └── SsrAsyncClient.tsx
│   │       └── rsc/
│   │           └── page.tsx             # Pure async server component
│   │
│   ├── components/
│   │   ├── DecisionDisplay.tsx      # Renders single decision with data-testid
│   │   ├── DecisionTable.tsx        # Renders multiple decisions (ForKeys/All)
│   │   ├── Nav.tsx                  # Navigation sidebar
│   │   └── ScenarioLayout.tsx       # Title + description wrapper
│   │
│   └── lib/
│       ├── config.ts                # Project configs (SDK keys from env)
│       ├── datafiles.ts             # Static datafile imports
│       ├── clients.ts               # Client factory functions
│       └── ups.ts                   # Mock async UserProfileService
│
└── tests/
    ├── provider/                    # 10 test files
    ├── hooks/                       # 8 test files
    └── rendering/                   # 3 test files
```

---

## Shared Utilities

### `src/lib/config.ts` — Project Configuration

Three project configs with SDK keys from env vars and flag key constants:

```ts
export const PROJECTS = {
  basic: { name: 'Basic + Holdout', sdkKey: process.env.NEXT_PUBLIC_BASIC_SDK_KEY },
  cmab:  { name: 'CMAB',           sdkKey: process.env.NEXT_PUBLIC_CMAB_SDK_KEY },
  odp:   { name: 'ODP',            sdkKey: process.env.NEXT_PUBLIC_ODP_SDK_KEY },
};

export const BASIC_FLAGS = { flag1: 'flag_basic_1', flag2: 'flag_basic_2', ... };
export const CMAB_FLAGS  = { cmabFlag: 'cmab_flag_1', ... };
export const ODP_FLAGS   = { odpFlag: 'flag_odp_1', ... };
```

### `src/lib/clients.ts` — Client Factories

All use `createInstance` from `@optimizely/react-sdk` (not the JS SDK — the React wrapper adds `REACT_CLIENT_META` metadata that hooks depend on).

| Factory | Config | Use Case |
|---------|--------|----------|
| `createBasicStaticClient(datafile)` | `createStaticProjectConfigManager`, no event processor | Scenarios needing sync decision from static datafile |
| `createBasicPollingClient(sdkKey, datafile?)` | `createPollingProjectConfigManager`, `createBatchEventProcessor` | Scenarios needing live datafile polling |
| `createOdpClient(sdkKey, datafile, { vuid })` | Adds `createOdpManager()`, optionally `createVuidManager()` | ODP scenarios |
| `createCmabClient(sdkKey, datafile)` | Adds `cmab: { cacheSize, cacheTtl }` config | CMAB scenarios |
| `createServerClient(datafile)` | Static, `disposable: true`, `DISABLE_DECISION_EVENT` | SSR/RSC scenarios |

### `src/lib/ups.ts` — Mock UserProfileService

`AsyncUserProfileService` class implementing `UserProfileServiceAsync` with in-memory Map storage and configurable delay (default 500ms). Used for `use-decide-async-ups`.

### `src/components/DecisionDisplay.tsx` — Key Shared Component

Renders every field of an `OptimizelyDecision` with `data-testid` attributes for Playwright:

```
data-testid="<prefix>-loading"
data-testid="<prefix>-error"
data-testid="<prefix>-enabled"
data-testid="<prefix>-variation-key"
data-testid="<prefix>-flag-key"
data-testid="<prefix>-rule-key"
data-testid="<prefix>-variables"
data-testid="<prefix>-reasons"
```

---

## Test Scenarios

### 1. Provider Behavior (React SDK specific)

| # | Route | Client Config | Provider Props | Expected Behavior |
|---|-------|--------------|----------------|-------------------|
| 01 | `/provider/01-user-datafile` | `createStaticProjectConfigManager({ datafile })` | `user` provided | Sync decision available immediately, no loading state |
| 02 | `/provider/02-user-datafile-sdkkey` | `createPollingProjectConfigManager({ sdkKey, datafile })` | `user` provided | Sync decision available immediately (datafile pre-loaded) |
| 03 | `/provider/03-user-sdkkey-only` | `createPollingProjectConfigManager({ sdkKey })`, no datafile | `user` provided | First render shows loading, then decision after datafile fetched |
| 04 | `/provider/04-odp-skip-segments` | ODP client with `createOdpManager()` | `user`, `skipSegments=true`, datafile given | Sync decision available (segments skipped) |
| 05 | `/provider/05-odp-qualified-segments` | ODP client with `createOdpManager()` | `user`, `skipSegments=false`, `qualifiedSegments` given, datafile given | Sync decision available (segments pre-provided) |
| 06 | `/provider/06-odp-fetch-segments` | ODP client with `createOdpManager()` | `user`, `skipSegments=false`, no `qualifiedSegments`, datafile given | First render shows loading, then decision after segments fetched |
| 07 | `/provider/07-multiple-providers` | One shared client | Two `<OptimizelyProvider>` wrappers with `timeout=100` and `timeout=5000` | Both render decisions; demonstrates different timeouts with same client |
| 08 | `/provider/08-forced-decision` | Basic static client | `user` + interactive buttons | Buttons call `setForcedDecision`, `removeForcedDecision`, `removeAllForcedDecisions`; decision updates reactively |
| 09 | `/provider/09-module-level-client` | Module-level `const client = createInstance(...)` | `user` | Decision works with module-scoped client |
| 10 | `/provider/10-component-level-client` | `useState(() => createInstance(...))` inside component | `user` | Decision works with component-scoped client |

#### Forced Decision Page Detail (Scenario 08)

1. Display current decision via `useDecide('flag_key')` using `DecisionDisplay`
2. Get `userContext` via `useOptimizelyUserContext()`
3. Three buttons:
   - **"Set Forced"** — `userContext.setForcedDecision({ flagKey }, { variationKey: 'forced_var' })`
   - **"Remove Forced"** — `userContext.removeForcedDecision({ flagKey })`
   - **"Remove All"** — `userContext.removeAllForcedDecisions()`
4. The `ProviderStateStore` wraps these methods to trigger per-flag-key notifications, so `useDecide` re-evaluates automatically.

---

### 2. Hook Functionality (Internal SDK testing with hooks)

| Route | Hook | Project | Key Behavior |
|-------|------|---------|-------------|
| `/hooks/use-decide` | `useDecide(flagKey)` | basic | Basic flag testing — returns `{ decision, isLoading, error }` |
| `/hooks/use-decide-holdout` | `useDecide(flagKey)` | basic (holdout flag) | Holdout testing — decision reflects holdout exclusion |
| `/hooks/use-decide-odp-vuid` | `useDecide(flagKey)` | odp | ODP + VUID enabled, **no user ID** — VUID-based decision |
| `/hooks/use-decide-odp-no-vuid` | `useDecide(flagKey)` | odp | ODP without VUID, user ID provided — segment-based decision |
| `/hooks/use-decide-for-keys` | `useDecideForKeys([...keys])` | basic | Multiple flag testing — returns `{ decisions }` map |
| `/hooks/use-decide-all` | `useDecideAll()` | basic | All flag testing — returns all active flag decisions |
| `/hooks/use-decide-async-cmab` | `useDecideAsync(flagKey)` | cmab | CMAB testing — loading then async prediction then decision |
| `/hooks/use-decide-async-ups` | `useDecideAsync(flagKey)` | basic + `AsyncUserProfileService` | UPS async testing — loading then UPS lookup then decision |
| `/hooks/use-decide-for-keys-async` | `useDecideForKeysAsync([...keys])` | cmab | Async multi-flag — loading then decisions map |
| `/hooks/use-decide-all-async` | `useDecideAllAsync()` | cmab | Async all flags — loading then all decisions |
| `/hooks/use-client` | `useOptimizelyClient()` | basic | Returns `Client`; displays `getOptimizelyConfig()` result |
| `/hooks/use-user-context` | `useOptimizelyUserContext()` | basic | Returns `{ userContext }`; button to call `trackEvent` |

---

### 3. Rendering Tests

| Route | Mode | Setup | What to Verify |
|-------|------|-------|----------------|
| `/rendering/ssr-sync` | SSR | Server component fetches datafile, passes to client component with `createStaticProjectConfigManager` | Decision visible in server HTML (no "Loading" in SSR output). Disable JS in browser to confirm. |
| `/rendering/ssr-async` | SSR | Client component with `sdkKey` only (no datafile at SSR time) | Server HTML shows "Loading"; client hydrates and replaces with real decision |
| `/rendering/rsc` | RSC | Pure `async` server component — imports from `@optimizely/react-sdk` (resolves to server entry via `react-server` export condition), calls `createInstance` → `onReady()` → `createUserContext()` → `decide()` → `close()` | Decision rendered entirely server-side, no client JS for this component |

---

## Playwright Test Strategy

### Configuration

- Dev server on port 3111 (`next dev --port 3111`)
- Chromium only
- `fullyParallel: true`, retries: 1
- No mocking of external services — tests assert at the decision level
- Placeholder expected values — will be replaced with real variation keys once projects are configured

### Test Patterns

**Pattern 1 — Sync decision (no loading)**
```ts
test('decision renders immediately', async ({ page }) => {
  await page.goto('/provider/01-user-datafile');
  await expect(page.getByTestId('decision-enabled')).toBeVisible();
  await expect(page.getByTestId('decision-variation-key')).not.toBeEmpty();
});
```

**Pattern 2 — Loading → decision transition**
```ts
test('shows loading then decision', async ({ page }) => {
  await page.goto('/provider/03-user-sdkkey-only');
  await expect(page.getByTestId('decision-enabled')).toBeVisible({ timeout: 15000 });
});
```

**Pattern 3 — SSR HTML verification**
```ts
test('decision present in server HTML', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/rendering/ssr-sync');
  await expect(page.getByTestId('decision-enabled')).toBeVisible();
  await ctx.close();
});
```

**Pattern 4 — Forced decision interaction**
```ts
test('set and remove forced decisions', async ({ page }) => {
  await page.goto('/provider/08-forced-decision');
  await page.getByTestId('btn-set-forced').click();
  await expect(page.getByTestId('decision-variation-key')).toHaveText('forced_var');
  await page.getByTestId('btn-remove-forced').click();
  // Decision reverts to original
});
```

### Test File Mapping

```
tests/
├── provider/
│   ├── user-datafile.spec.ts
│   ├── user-datafile-sdkkey.spec.ts
│   ├── user-sdkkey-only.spec.ts
│   ├── odp-skip-segments.spec.ts
│   ├── odp-qualified-segments.spec.ts
│   ├── odp-fetch-segments.spec.ts
│   ├── multiple-providers.spec.ts
│   ├── forced-decisions.spec.ts
│   ├── module-level-client.spec.ts
│   └── component-level-client.spec.ts
├── hooks/
│   ├── use-decide.spec.ts
│   ├── use-decide-holdout.spec.ts
│   ├── use-decide-odp.spec.ts
│   ├── use-decide-for-keys.spec.ts
│   ├── use-decide-all.spec.ts
│   ├── use-decide-async.spec.ts
│   ├── use-client.spec.ts
│   └── use-user-context.spec.ts
└── rendering/
    ├── ssr-sync.spec.ts
    ├── ssr-async.spec.ts
    └── rsc.spec.ts
```

---

## Dependencies

```json
{
  "name": "v4-bug-bash",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3111",
    "build": "next build",
    "start": "next start --port 3111",
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@optimizely/react-sdk": "file:../../"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.0"
  }
}
```

> The `file:../../` link means the React SDK must be built (`npm run build` in repo root) before running the bug bash app.

---

## Implementation Phases

### Phase 1: Scaffold
1. `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local.example`
2. Placeholder `datafiles/*.json` (replace with real exports)
3. `src/lib/` utilities: `config.ts`, `datafiles.ts`, `clients.ts`, `ups.ts`
4. Shared components: `DecisionDisplay`, `DecisionTable`, `Nav`, `ScenarioLayout`
5. Root layout + dashboard page
6. Verify `npm run dev` starts

### Phase 2: Provider Scenarios (10 pages)
7. Pages 01-03 (basic provider configs)
8. Pages 04-06 (ODP variants)
9. Pages 07-10 (multiple providers, forced decisions, module/component level)

### Phase 3: Hook Scenarios (12 pages)
10. Sync hooks: `use-decide`, `use-decide-for-keys`, `use-decide-all`
11. Specialized: `use-decide-holdout`, `use-decide-odp-vuid`, `use-decide-odp-no-vuid`
12. Async hooks: `use-decide-async-cmab`, `use-decide-async-ups`, `use-decide-for-keys-async`, `use-decide-all-async`
13. Utility hooks: `use-client`, `use-user-context`

### Phase 4: Rendering Scenarios (3 pagese)
14. `ssr-sync` (server component + client component pattern)
15. `ssr-async` (loading state on server, decision on client)
16. `rsc` (pure async server component using server entry)

### Phase 5: Playwright Tests
17. `playwright.config.ts` + browser install
18. Provider test specs (10 files)
19. Hook test specs (8 files)
20. Rendering test specs (3 files)

### Phase 6: Datafiles + Test Values
21. Export real datafiles from the three Optimizely projects
22. Update placeholder expected values in Playwright tests with real variation keys

---

## Verification Checklist

- [ ] `cd examples/v4-bug-bash && npm install && npm run dev` starts on port 3111
- [ ] Dashboard at `http://localhost:3111` links to all 25 scenario pages
- [ ] Each provider scenario page renders decisions correctly
- [ ] Each hook scenario page exercises the hook and displays results
- [ ] SSR sync: disable JS in browser, visit `/rendering/ssr-sync` — decision visible
- [ ] RSC: visit `/rendering/rsc` — decision rendered, no client React bundle
- [ ] `npx playwright test` — all E2E tests pass

---

## Key SDK Files for Reference

| File | Why It Matters |
|------|---------------|
| `src/client/createInstance.ts` | Client factory with `REACT_CLIENT_META` — all factories must use this |
| `src/provider/OptimizelyProvider.tsx` | Provider props and lifecycle |
| `src/provider/ProviderStateStore.ts` | Forced decision subscription mechanism |
| `src/utils/UserContextManager.ts` | VUID/ODP segment resolution — controls loading vs sync behavior |
| `docs/nextjs-integration.md` | Reference patterns for SSR/RSC pages |
| `src/hooks/useAsyncDecision.ts` | Async hook state machine with cancellation |
