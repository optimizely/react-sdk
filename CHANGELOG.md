# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### New Features

- Added `useFeature` hook
  - Can be used to retrieve the status of a feature flag and its variables. See [#28](https://github.com/optimizely/react-sdk/pull/28) for more details.

### Enhancements

- Exposed the entire context object used by 
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
