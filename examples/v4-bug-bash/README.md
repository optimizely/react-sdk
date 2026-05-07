# V4 Bug Bash

Comprehensive test scenarios for the Optimizely React SDK v4. Built with Next.js 15 and Playwright.

## Setup

```bash
# From the repo root, build the SDK first
npm run build

# Navigate to the example
cd examples/v4-bug-bash

# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Environment Variables

Some scenarios (SDK key polling, ODP, CMAB) require environment variables. Create a `.env.local` file:

```env
NEXT_PUBLIC_BASIC_SDK_KEY=<your-basic-project-sdk-key>
NEXT_PUBLIC_ODP_SDK_KEY=<your-odp-project-sdk-key>
NEXT_PUBLIC_CMAB_SDK_KEY=<your-cmab-project-sdk-key>
```

Scenarios that use a static datafile (01, 07-11, and most hooks) work without any environment variables.

## Running the App

```bash
# Start the dev server on port 3111
npm run dev
```

Open [http://localhost:3111](http://localhost:3111) to see the dashboard with all scenarios.

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run tests in Playwright UI mode
npm test -- --ui

# Run tests in strict mode (React StrictMode enabled)
npm run test:strict

# Run a specific test file
npm test -- tests/provider/user-change.spec.ts

# Run tests matching a pattern
npm test -- --grep "holdout"
```

Playwright auto-starts the dev server on port 3111 before running tests.

## Test Scenarios

### Provider (`/provider/*`)

| # | Scenario | Key Behavior |
|---|----------|-------------|
| 01 | User + Datafile | Static datafile, immediate decision |
| 02 | User + Datafile + SDK Key | Polling with pre-loaded datafile |
| 03 | User + SDK Key Only | Loading state, then decision after fetch |
| 04 | ODP Skip Segments | ODP with `skipSegments=true` |
| 05 | ODP Qualified Segments | Pre-provided `qualifiedSegments` |
| 06 | ODP Fetch Segments | ODP segment fetch with loading state |
| 07 | Multiple Providers | Two providers, same client, different users |
| 08 | Forced Decisions | Interactive set/remove forced decisions |
| 09 | Module-Level Client | Client at module scope |
| 10 | Component-Level Client | Client inside `useState` |
| 11 | User Change | Dynamic user switch via button |

### Hooks (`/hooks/*`)

| Scenario | Hook |
|----------|------|
| useDecide | `useDecide(flagKey)` |
| useDecide (Holdout) | `useDecide(flagKey)` with holdout |
| useDecide (ODP+VUID) | ODP with VUID, no user ID |
| useDecide (ODP no VUID) | ODP with user ID |
| useDecideForKeys | `useDecideForKeys(flagKeys)` |
| useDecideAll | `useDecideAll()` |
| useDecideAsync (CMAB) | `useDecideAsync(flagKey)` with CMAB |
| useDecideAsync (UPS) | `useDecideAsync(flagKey)` with async UPS |
| useDecideForKeysAsync | `useDecideForKeysAsync(flagKeys)` |
| useDecideAllAsync | `useDecideAllAsync()` |
| useOptimizelyClient | `useOptimizelyClient()` |
| useOptimizelyUserContext | `useOptimizelyUserContext()` + `trackEvent` |

### Rendering (`/rendering/*`)

| Scenario | Description |
|----------|-------------|
| SSR Sync | Datafile passed from server, decision in server HTML |
| SSR Async | SDK key only, loading in server HTML, decision after hydration |
| RSC | Pure server component, no client JS |
