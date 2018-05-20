# Changelog
All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.0.2] - 2018-05-19
### Added
- `./documentation/DOCUMENTATION.md` document which gives overview of the applications protocol
- `./documentation/DEPLOY.md` document which gives overview of deploying the server live
- `./LICENSE` License file
- Code highlighting, triggered with #

### Changed
- `README.md` wording and layout

### Removed
- Unneeded `use strict`

## [2.0.1] - 2018-04-18
### Added
- `users-kicked` tracking to `morestats` command
- Server-side ping interval
- `move` command to change channels without reconnecting
- `disconnect` command module to free core server from protocol dependency
- `changenick` command to change client nick without reconnecting

### Changed
- Filter object of the `findSockets` function now accepts more complex parameters, including functions and arrays
- `kick` command now accepts an array as the `nick` argument allowing multiple simultaneous kicks
- `join` command now takes advantage of the new filter object
- Core server disconnect handler now calls the `disconnect` module instead of broadcasting hard coded `onlineRemove`

### Removed
- Client-side ping interval

## [2.0.0] - 2018-04-12
### Added
- CHANGELOG.md
- `index.html` files to `katex` directories

### Changed
- Updated client html KaTeX libraries to v0.9.0

### Removed
- Uneeded files under `katex` directories
