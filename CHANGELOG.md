# Changelog

## [3.2.4] - May 15, 2025
### Bug fixes
- `client.onReady()` always returns false when ODP is off and user id is null bug fix.([#302](https://github.com/optimizely/react-sdk/pull/285))

## [3.2.3] - Nov 22, 2024

### Bug fixes
- `isClientReady` logic adjustment.([#285](https://github.com/optimizely/react-sdk/pull/285))
- `track` method overrideAttribute bug fix.([#287](https://github.com/optimizely/react-sdk/pull/287)) 
- "`OptimizelyProvider` resets previously set user" bug fix.([#292](https://github.com/optimizely/react-sdk/pull/292)) 
 

## [3.2.2] - Aug 21, 2024

### Bug fixes 
- Multiple instances of the Logger make the log system unconfigurable - bug fix. ([#276](https://github.com/optimizely/react-sdk/pull/276))

## [3.2.1] - Aug 15, 2024

### Bug fixes 
- `clientReady` is true even though internal client promise returns `success == false` bug fix([#273](https://github.com/optimizely/react-sdk/pull/273))
- `useDecision` hook set the update listener on overy render bug fix([#273](https://github.com/optimizely/react-sdk/pull/273))
- `setForcedDecision` does not reflect the changes in optmizely instance and `useDecision` hook bug fix([#274](https://github.com/optimizely/react-sdk/pull/274))

### Changed
- Performance improvements in both hooks and client instance([#273](https://github.com/optimizely/react-sdk/pull/273), [#274](https://github.com/optimizely/react-sdk/pull/274))

## [3.2.0] - July 10, 2024

### New Features 
- The new `useTrackEvent` hook is now available for tracking events within functional components. This hook offers all the existing track event functionalities provided by the SDK. ([#268](https://github.com/optimizely/react-sdk/pull/268))

## [3.1.2] - July 2, 2024

### Changed 
- JS SDK bump up for react native polyfill support ([#266](https://github.com/optimizely/react-sdk/pull/266))

## [3.1.1] - May 22, 2024

### Bug Fixes
- ODP integration error. ([#262](https://github.com/optimizely/react-sdk/pull/262))

## [3.1.0] - April 9, 2024

### Bug Fixes
- Error initializing client. The core client or user promise(s) rejected.
 ([#255](https://github.com/optimizely/react-sdk/pull/255))
- Unable to determine if feature "{your-feature-key}" is enabled because User ID is not set([#255](https://github.com/optimizely/react-sdk/pull/255))

### Changed
- Bumped Optimizely JS SDK version in use ([#255](https://github.com/optimizely/react-sdk/pull/255))
- Resolve dependabot dependency vulnerabilities ([#245](https://github.com/optimizely/react-sdk/pull/245), [#247](https://github.com/optimizely/react-sdk/pull/247), [#248](https://github.com/optimizely/react-sdk/pull/248), [#251](https://github.com/optimizely/react-sdk/pull/251), [#253](https://github.com/optimizely/react-sdk/pull/253))
- Add node versions during testing ([#249](https://github.com/optimizely/react-sdk/pull/249))

## [3.0.1] - February 27, 2024

### Changed
- Updated `@optimizely/optimizely-sdk` to version `5.0.1` ([#242](https://github.com/optimizely/react-sdk/pull/242))
- Updated Dependabot alerts ([#239](https://github.com/optimizely/react-sdk/pull/239), [#241](https://github.com/optimizely/react-sdk/pull/241))

## [3.0.0] - January 24, 2024

### New Features  

The 3.0.0 release introduces a new primary feature, [Advanced Audience Targeting]( https://docs.developers.optimizely.com/feature-experimentation/docs/optimizely-data-platform-advanced-audience-targeting) enabled through integration with [Optimizely Data Platform (ODP)](https://docs.developers.optimizely.com/optimizely-data-platform/docs)  (
  [#229](https://github.com/optimizely/react-sdk/pull/229), 
  [#214](https://github.com/optimizely/react-sdk/pull/214), 
  [#213](https://github.com/optimizely/react-sdk/pull/213), 
  [#212](https://github.com/optimizely/react-sdk/pull/212), 
  [#208](https://github.com/optimizely/react-sdk/pull/208), 
  [#207](https://github.com/optimizely/react-sdk/pull/207), 
  [#206](https://github.com/optimizely/react-sdk/pull/206), 
  [#205](https://github.com/optimizely/react-sdk/pull/205),
  [#201](https://github.com/optimizely/react-sdk/pull/201), 
  [#200](https://github.com/optimizely/react-sdk/pull/200), 
  [#199](https://github.com/optimizely/react-sdk/pull/199))

You can use ODP, a high-performance [Customer Data Platform (CDP)]( https://www.optimizely.com/optimization-glossary/customer-data-platform/), to easily create complex real-time segments (RTS) using first-party and 50+ third-party data sources out of the box. You can create custom schemas that support the user attributes important for your business, and stitch together user behavior done on different devices to better understand and target your customers for personalized user experiences. ODP can be used as a single source of truth for these segments in any Optimizely or 3rd party tool.  

With ODP accounts integrated into Optimizely projects, you can build audiences using segments pre-defined in ODP. The SDK will fetch the segments for given users and make decisions using the segments. For access to ODP audience targeting in your Feature Experimentation account, please contact your Customer Success Manager. 

This release leverages the Optimizely JavaScript SDK 5+

This version includes the following changes: 

- New APIs added to `ReactSDKClient`: 

	- `fetchQualifiedSegments()`: this API will retrieve user segments from the ODP server. The fetched segments will be used for audience evaluation. The fetched data will be stored in the local cache to avoid repeated network delays. 

  - `getUserContext()`: get the current `OptimizelyUserContext` object in use at the React SDK level.
  
  - `getVuid()`:  provides access to the anonymous client-side visitor ID (VUID) generated by the JS SDK. This ID is used to identify unique visitors in Optimizely Results in the absence of a standard user ID.
  
  - `sendOdpEvent()`: customers can build/send arbitrary ODP events that will bind user identifiers and data to user profiles in ODP. 

For details, refer to our documentation pages:  

- [Advanced Audience Targeting](https://docs.developers.optimizely.com/feature-experimentation/docs/optimizely-data-platform-advanced-audience-targeting)  

- [Client SDK Support](https://docs.developers.optimizely.com/feature-experimentation/v1.0/docs/advanced-audience-targeting-for-client-side-sdks) 

- [Initialize React SDK](https://docs.developers.optimizely.com/feature-experimentation/docs/initialize-sdk-react) 

- [Advanced Audience Targeting segment qualification methods](https://docs.developers.optimizely.com/feature-experimentation/docs/advanced-audience-targeting-segment-qualification-methods-react) 

- [Send Optimizely Data Platform data using Advanced Audience Targeting](https://docs.developers.optimizely.com/feature-experimentation/docs/send-odp-data-using-advanced-audience-targeting-react) 

### Breaking Changes 
- Dropped support for the following browser versions.
  - All versions of Microsoft Internet Explorer.
  - Chrome versions earlier than `102.0`.
  - Microsoft Edge versions earlier than `84.0`.
  - Firefox versions earlier than `91.0`.
  - Opera versions earlier than `76.0`.
  - Safari versions earlier than `13.0`.
- Dropped support for Node JS versions earlier than `16`.

### Changed
- Updated `@optimizely/optimizely-sdk` to version `5.0.0` ([#230](https://github.com/optimizely/react-sdk/pull/230)).
- Removed use of deprecated `@optimizely/js-sdk-*` packages.
- Minor version bumps to dependencies. 

### Bug Fixes
- Updated `OptimizelyProvider` to  ([#229](https://github.com/optimizely/react-sdk/pull/229))
  - correctly adhere to optional `userId?` and `user?` interface fields, using the `DefaultUser` to signal to client-side contexts to use the new `vuid` identifier. 
  - correctly use of the correct React lifecyle methods.


## [3.0.0-beta2] - December 26, 2023

### Bug fixes  
- Tag release correctly during publishing
- Updated datafile variable in README
- AAT gap fill
- Rendering `default` OptimizelyVariation when not last
- OptimizelyVariation with default and variation props set

## [3.0.0-beta] - September 22, 2023

### New Features  

The 3.0.0-beta release introduces a new primary feature, [Advanced Audience Targeting]( https://docs.developers.optimizely.com/feature-experimentation/docs/optimizely-data-platform-advanced-audience-targeting) enabled through integration with [Optimizely Data Platform (ODP)](https://docs.developers.optimizely.com/optimizely-data-platform/docs)  (#214, #213, #212, #208, #207, #206, #205, #201, #200, #199)

You can use ODP, a high-performance [Customer Data Platform (CDP)]( https://www.optimizely.com/optimization-glossary/customer-data-platform/), to easily create complex real-time segments (RTS) using first-party and 50+ third-party data sources out of the box. You can create custom schemas that support the user attributes important for your business, and stitch together user behavior done on different devices to better understand and target your customers for personalized user experiences. ODP can be used as a single source of truth for these segments in any Optimizely or 3rd party tool.  

With ODP accounts integrated into Optimizely projects, you can build audiences using segments pre-defined in ODP. The SDK will fetch the segments for given users and make decisions using the segments. For access to ODP audience targeting in your Feature Experimentation account, please contact your Customer Success Manager. 

This release leverages the Optimizely JavaScript SDK beta5+

This version includes the following changes: 

- New API added to `OptimizelyUserContext`: 

	- `fetchQualifiedSegments()`: this API will retrieve user segments from the ODP server. The fetched segments will be used for audience evaluation. The fetched data will be stored in the local cache to avoid repeated network delays. 

	- When an `OptimizelyUserContext` is created, the SDK will automatically send an identify request to the ODP server to facilitate observing user activities. 

- New APIs added to `OptimizelyClient`: 

	- `sendOdpEvent()`: customers can build/send arbitrary ODP events that will bind user identifiers and data to user profiles in ODP. 

	- `createUserContext()` with anonymous user IDs: user-contexts can be created without a userId. The SDK will create and use a persistent `VUID` specific to a device when userId is not provided. 

For details, refer to our documentation pages:  

- [Advanced Audience Targeting](https://docs.developers.optimizely.com/feature-experimentation/docs/optimizely-data-platform-advanced-audience-targeting)  

- [Client SDK Support](https://docs.developers.optimizely.com/feature-experimentation/v1.0/docs/advanced-audience-targeting-for-client-side-sdks) 

- [Initialize React SDK](https://docs.developers.optimizely.com/feature-experimentation/docs/initialize-sdk-react) 

- [Advanced Audience Targeting segment qualification methods](https://docs.developers.optimizely.com/feature-experimentation/docs/advanced-audience-targeting-segment-qualification-methods-react) 

- [Send Optimizely Data Platform data using Advanced Audience Targeting](https://docs.developers.optimizely.com/feature-experimentation/docs/send-odp-data-using-advanced-audience-targeting-react) 

### Breaking Changes 
- Dropped support for the following browser versions.
  - All versions of Microsoft Internet Explorer.
  - Chrome versions earlier than `102.0`.
  - Microsoft Edge versions earlier than `84.0`.
  - Firefox versions earlier than `91.0`.
  - Opera versions earlier than `76.0`.
  - Safari versions earlier than `13.0`.
- Dropped support for Node JS versions earlier than `14`.

### Changed
- Updated `createUserContext`'s `userId` parameter to be optional due to the Browser variation's use of the new `vuid` field.

## [2.9.2] - March 13, 2023

### Enhancements
- We updated our README.md and other non-functional code to reflect that this SDK supports both Optimizely Feature Experimentation and Optimizely Full Stack. ([#190](https://github.com/optimizely/react-sdk/pull/190)).

## [2.9.1] - July 20, 2022

### Bug fixes
- Fixed Redundant activate calls in useExperiment hook for one scenario.

## [2.9.0] - June 15, 2022

### Bug fixes
- addresses issues [#152](https://github.com/optimizely/react-sdk/issues/152) and [#134](https://github.com/optimizely/react-sdk/issues/134): Gracefully returns pessimistic default values when hooks fail instead of throwing an error.
- fixed issue [#156](https://github.com/optimizely/react-sdk/issues/156) - Added children prop to make the SDK compatible with React 18([#158](https://github.com/optimizely/react-sdk/pull/158)).
- Updates React SDK to use React 18 and fixed related typescript issues ([#159](https://github.com/optimizely/react-sdk/pull/159)).
- Replaces `enzyme` with `react testing library` to make unit tests work with React 18 ([#159](https://github.com/optimizely/react-sdk/pull/159)).

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
