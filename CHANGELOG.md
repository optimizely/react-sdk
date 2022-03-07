# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [2.8.1] - March 7, 2022

### Enhancements
- fixed issue [#49](https://github.com/optimizely/react-sdk/issues/49): Return type of `createInstance` was `OptimizelyReactSDKClient` which is the implementation class. Changed it to the `ReactSDKClient` interface instead ([#148](https://github.com/optimizely/react-sdk/pull/148)).

- fixed issue [#121](https://github.com/optimizely/react-sdk/issues/121):`ActivateListenerPayload` and `TrackListenerPayload` types were exported from `@optimizely/optimizely-sdk` but were missing from `@optimizely/react-sdk` exports. ([#150](https://github.com/optimizely/react-sdk/pull/150)).

### Bug fixes
- Fixed issue [#134](https://github.com/optimizely/react-sdk/issues/134) of the React SDK crashing when the internal Optimizely client returns as a null value. [PR #149](https://github.com/optimizely/react-sdk/pull/149)

## [2.8.0] - January 26, 2022

### New Features
- Add a set of new APIs for overriding and managing user-level flag, experiment and delivery rule decisions. These methods can be used for QA and automated testing purposes. They are an extension of the ReactSDKClient interface ([#133](https://github.com/optimizely/react-sdk/pull/133)):
  - setForcedDecision
  - getForcedDecision
  - removeForcedDecision
  - removeAllForcedDecisions
- Updated `useDecision` hook to auto-update and reflect changes when forced decisions are set and removed ([#133](https://github.com/optimizely/react-sdk/pull/133)).
- For details, refer to our documentation pages: [ReactSDKClient](https://docs.developers.optimizely.com/full-stack/v4.0/docs/reactsdkclient), [Forced Decision methods](https://docs.developers.optimizely.com/full-stack/v4.0/docs/forced-decision-methods-react) and [useDecision hook](https://docs.developers.optimizely.com/full-stack/v4.0/docs/usedecision-react).

### Bug fixes
- Fixed the SDK to render the correct decision on first render when initialized synchronously using a datafile ([#125](https://github.com/optimizely/react-sdk/pull/125)).
- Fixed the redundant re-rendering when SDK is initialized with both datafile and SDK key ([#125](https://github.com/optimizely/react-sdk/pull/125)).
- Updated `@optimizely/js-sdk-logging` to 0.3.1 ([#140](https://github.com/optimizely/react-sdk/pull/140)). 

## [2.7.1-alpha] - October 1st, 2021

### Bug fixes
- Fixed the SDK to render the correct decision on first render when initialized synchronously using a datafile ([#125](https://github.com/optimizely/react-sdk/pull/125)).
- Fixed the redundant re-rendering when SDK is initialized with both datafile and SDK key ([#125](https://github.com/optimizely/react-sdk/pull/125)).

## [2.7.0] - September 16th, 2021
Upgrade `@optimizely/optimizely-sdk` to [4.7.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.7.0):
 - Added new public properties to `OptimizelyConfig` . See [@optimizely/optimizely-sdk Release 4.7.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.7.0) for details
 - Deprecated `OptimizelyFeature.experimentsMap` of `OptimizelyConfig`. See [@optimizely/optimizely-sdk Release 4.7.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.7.0) for details
 - For more information, refer to our documentation page: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/optimizelyconfig-react](https://docs.developers.optimizely.com/full-stack/v4.0/docs/optimizelyconfig-react)

## [2.6.3] - July 29th, 2021

### Bug fixes
- Update `VariableValuesObject` type to handle JSON type variable and avoid TS compiler error when specifying variable type ([#118](https://github.com/optimizely/react-sdk/pull/118)).

## [2.6.2] - July 15th, 2021

### Bug fixes
- Upgrade `@optimizely/optimizely-sdk` to [4.6.2](https://github.com/optimizely/javascript-sdk/releases/tag/v4.6.2). Fixed incorrect impression event payload in projects containing multiple flags with duplicate key rules. See [@optimizely/optimizely-sdk Release 4.6.2](https://github.com/optimizely/javascript-sdk/releases/tag/v4.6.2) for more details.

## [2.6.1] - July 8th, 2021

### Bug fixes
- Upgrade `@optimizely/optimizely-sdk` to [4.6.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.6.1). Fixed serving incorrect variation issue in projects containing multiple flags with same key rules. See [@optimizely/optimizely-sdk Release 4.6.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.6.1) for more details.

## [2.6.0] - June 8th, 2021
Upgrade `@optimizely/optimizely-sdk` to [4.6.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.6.0)
 - Added support for multiple concurrent prioritized experiments per flag. See [@optimizely/optimizely-sdk Release 4.6.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.6.0) for more details.

## [2.5.0] - March 12th, 2021
- Upgrade `@optimizely/optimizely-sdk` to [4.5.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.5.1)
- Added support for new set of decide APIs ([#98](https://github.com/optimizely/react-sdk/pull/98))
- Introducing `useDecision` hook to retrieve the decision result for a flag key, optionally auto updating that decision based on underlying user or datafile changes ([#100](https://github.com/optimizely/react-sdk/pull/100), [#105](https://github.com/optimizely/react-sdk/pull/105))
- For details, refer to our documentation page: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-react-sdk](https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-react-sdk)

## [2.4.3] - March 2nd, 2021
### Bug fixes
- This version of React SDK depends on [4.4.3](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.3) of `@optimizely/optimizely-sdk`. The dependency was defined to use the latest available minor version which is no more compatible. Fixed the dependency to use the exact version.

## [2.4.2] - December 11th, 2020
### Bug fixes
- Always recompute decision after resolution of ready promise ([#91](https://github.com/optimizely/react-sdk/pull/91))

## [2.4.1] - November 23rd, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.4.3](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.3):
 - Allowed using `--isolatedModules` flag in TSConfig file by fixing exports in event processor . See [Issue #84](https://github.com/optimizely/react-sdk/issues/84) and [@optimizely/optimizely-sdk Release 4.4.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.1) for more details.
 - Added `enabled` field to decision metadata structure to support upcoming application-controlled introduction of tracking for non-experiment Flag decisions. See [@optimizely/optimizely-sdk Release 4.4.2](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.2) for more details.
 - Refactored imports in `optimizely-sdk` TypeScript type definitions to prevent compilation of TS source code. See [@optimizely/optimizely-sdk Release 4.4.2](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.2) and [@optimizely/optimizely-sdk Release 4.4.3](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.3) for more details.

## [2.4.0] - November 2nd, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.4.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.0):
 - Added support for upcoming application-controlled introduction of tracking for non-experiment Flag decisions. See [@optimizely/optimizely-sdk Release 4.4.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.4.0) for more details.

### New features
- Add UMD and System build targets, available at `dist/react-sdk.umd.js` and `dist/react-sdk.system.js`, respectively ([#80](https://github.com/optimizely/react-sdk/pull/80))

### Bug fixes
- Fix `logOnlyEventDispatcher` to conform to `EventDispatcher` type from @optimizely/optimizely-sdk ([#81](https://github.com/optimizely/react-sdk/pull/81))
- Change the file extension of the ES module bundle from .mjs to .es.js. Resolves issues using React SDK with Gatsby ([#82](https://github.com/optimizely/react-sdk/pull/82)).

## [2.3.2] - October 9th, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.3.4](https://github.com/optimizely/javascript-sdk/releases/tag/v4.3.4):
  - Exported Optimizely Config Entities types from TypeScript type definitions. See [@optimizely/optimizely-sdk Release 4.3.3](https://github.com/optimizely/javascript-sdk/releases/tag/v4.3.3) for more details.
  - Fixed return type of `getAllFeatureVariables` method in TypeScript type definitions. See [@optimizely/optimizely-sdk Release 4.3.2](https://github.com/optimizely/javascript-sdk/releases/tag/v4.3.2) for more details.

### Bug fixes
  - Fixed return type of `getAllFeatureVariables` method in ReactSDKClient ([#76](https://github.com/optimizely/react-sdk/pull/76))

## [2.3.1] - October 5th, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.3.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.3.1). Added support for version audience evaluation and datafile accessor. See [@optimizely/optimizely-sdk Release 4.3.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.3.0) for more details.

## [2.3.0] - October 2nd, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.2.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.2.0)

### New Features
  - `useExperiment` and `useFeature` hooks re-render when override user ID or attributes change([#64](https://github.com/optimizely/react-sdk/pull/64))

### Bug fixes
  - `useExperiment` and `useFeature` hooks return up-to-date decision values on the first call after the client is ready ([#64](https://github.com/optimizely/react-sdk/pull/64))

## [2.3.0-beta] - August 27th, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.2.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.2.0)

### New Features
  - `useExperiment` and `useFeature` hooks re-render when override user ID or attributes change([#64](https://github.com/optimizely/react-sdk/pull/64))

### Bug fixes
  - `useExperiment` and `useFeature` hooks return up-to-date decision values on the first call after the client is ready ([#64](https://github.com/optimizely/react-sdk/pull/64))

## [2.2.0] - July 31st, 2020
Upgrade `@optimizely/optimizely-sdk` to [4.2.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.2.0)

### New Features
  - Better offline support in React Native apps:
    - Persist downloaded datafiles in local storage for use in subsequent SDK initializations
    - Persist pending impression & conversion events in local storage

### Bug fixes
  - Fixed log messages for Targeted Rollouts

## [2.1.0] - July 8th, 2020
Upgrade `@optimizely/optimizely-sdk` to 4.1.0. See [@optimizely/optimizely-sdk Release 4.1.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.1.0) for more details.

## New Features
- Add support for JSON feature variables ([#53](https://github.com/optimizely/react-sdk/pull/53))

## [2.0.1] - May 22nd, 2020

### Bug Fixes

- Export `useExperiment` hook from this package ([#50](https://github.com/optimizely/react-sdk/pull/50))

## [2.0.0] - April 30th, 2020

Upgrade `@optimizely/optimizely-sdk` to 4.0.0. See [@optimizely/optimizely-sdk Release 4.0.0](https://github.com/optimizely/javascript-sdk/releases/tag/v4.0.0) for more details.

### Breaking Changes

- Changed supported React version to 16.8+

- @optimizely/optimizely-sdk no longer adds `Promise` polyfill in its browser entry point

- Dropped support for Node.js version <8

### New Features

- Refactored `<OptimizelyFeature>` to a functional component that uses the `useFeature` hook under the hood. See [#32](https://github.com/optimizely/react-sdk/pull/32) for more details.

- Refactored `<OptimizelyExperiment>` to a functional component that uses the `useExperiment` hook under the hood. See [#36](https://github.com/optimizely/react-sdk/pull/36) for more details.

- Added `useExperiment` hook

  - Can be used to retrieve the variation for an experiment. See [#36](https://github.com/optimizely/react-sdk/pull/36) for more details.

- Added `useFeature` hook
  - Can be used to retrieve the status of a feature flag and its variables. See [#28](https://github.com/optimizely/react-sdk/pull/28) for more details.

- Removed lodash dependency

### Enhancements

- Exposed the entire context object used by `<OptimizelyProvider>`.
  - Enables support for using APIs which require passing reference to a context object, like `useContext`. [#27](https://github.com/optimizely/react-sdk/pull/27) for more details.


## [2.0.0-rc.2] - April 24th, 2020

### Bug Fixes

- Upgrade `@optimizely/optimizely-sdk` to 4.0.0-rc.2. Allow creating multiple instances from the same datafile object. See [@optimizely/optimizely-sdk Release 4.0.0-rc.2](https://github.com/optimizely/javascript-sdk/releases/tag/v4.0.0-rc.2) for more details.


## [2.0.0-rc.1] - April 20th, 2020

### Breaking Changes

- Upgrade `@optimizely/optimizely-sdk` to 4.0.0-rc.1. Dropped support for Node.js version <8. See [@optimizely/optimizely-sdk Release 4.0.0-rc.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.0.0-rc.1) for more details.

## [2.0.0-alpha.2] - April 3rd, 2020

### Breaking Changes

- Upgrade `@optimizely/optimizely-sdk` to 4.0.0-alpha.1. `Promise` polyfill no longer included. See [@optimizely/optimizely-sdk Release 4.0.0-alpha.1](https://github.com/optimizely/javascript-sdk/releases/tag/v4.0.0-alpha.1) for more details.

## [2.0.0-alpha.1] - March 18th, 2020

### Breaking Changes

- Changed supported React version to 16.8+

### New Features

- Refactored `<OptimizelyFeature>` to a functional component that uses the `useFeature` hook under the hood. See [#32](https://github.com/optimizely/react-sdk/pull/32) for more details.

- Refactored `<OptimizelyExperiment>` to a functional component that uses the `useExperiment` hook under the hood. See [#36](https://github.com/optimizely/react-sdk/pull/36) for more details.

- Added `useExperiment` hook

  - Can be used to retrieve the variation for an experiment. See [#36](https://github.com/optimizely/react-sdk/pull/36) for more details.

- Added `useFeature` hook
  - Can be used to retrieve the status of a feature flag and its variables. See [#28](https://github.com/optimizely/react-sdk/pull/28) for more details.

### Enhancements

- Exposed the entire context object used by `<OptimizelyProvider>`.
  - Enables support for using APIs which require passing reference to a context object, like `useContext`. [#27](https://github.com/optimizely/react-sdk/pull/27) for more details.

## [1.2.0-alpha.1] - March 5th, 2020

### New Features

- Updated minor version of core SDK (`@optimizely/optimizely-sdk`) dependency which, for unrecognized events sent via `.track()`, will impact the log levels in this SDK as well.

## [1.1.0] - January 30th, 2020

### New Features

- Added a new API to get project configuration static data.
  - Call `getOptimizelyConfig()` to get a snapshot of project configuration static data.
  - It returns an `OptimizelyConfig` instance which includes a datafile revision number, all experiments, and feature flags mapped by their key values.
  - Added caching for `getOptimizelyConfig` - `OptimizelyConfig` object will be cached and reused for the lifetime of the datafile.
  - For details, refer to our documentation page: [https://docs.developers.optimizely.com/full-stack/docs/optimizelyconfig-react](https://docs.developers.optimizely.com/full-stack/docs/optimizelyconfig-react).

## [1.0.1] - November 18th, 2019

### Fixed

- Javascript SDK Client version was being sent in dispatched events. Changed it to send React SDK client version.
- Updated `@optimizely/optimizely-sdk to 3.3.2.` Includes a better default logger for React Native and a fix for an error message logged when a user is bucketed to empty space.
- Replaced usage of `react-broadcast` with the native React Context API

## [1.0.0] - September 27th, 2019

Initial release
