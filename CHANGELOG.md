# Changelog
All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.1.93 pre 2.2] - 2020-03-12
### Added
- (Source) `./pm2.config.js` PM2 ecosystem config handling both http-server and the websocket
- (Source) NPM new commands:
- "start": Starts or reloads the dev environment
- "stop": Stops and clears the dev environment
- "logs": Show / watch http & websocket logs for errors and events
- "clear": Clear all logged data
- "status": Show status of http and websocket
- "refresh": Clears logged data and stops http and websocket
- (Server) Numeric user levels / UAC, related to issue #86
- (Server) `join` module password property, related to V2 protocol update
- (Server) `users` array to `onlineSet` structure, related to V2 protocol update
- (Server) `session` module, related to V2 protocol update
- (Server) `/move` chat hook to `move` module

### Removed
- (Source) `./clientSource/` directory

### Changed
- (Server) Minor bug fixes
- (Server) Increased module abstraction to remove duplicate code (thanks @MinusGix)

## [2.1.92 pre 2.2] - 2019-11-06
### Added
- (Server) `./server/src/utility/` directory
- (Server) `Constants.js` class in `utility`
- (Server) `esm` module to transpile ES6

### Changed
- (Server) Changed ES5 styling to ES6
- (Server) And improved source comments
- (Server) Minor code format changes
- (Server) Updated all dependencies (be sure to update your local copy with the new packages)

## [2.1.91 pre 2.2] - 2019-08-17
### Added
- (Client) Markdown engine
- (Client) Imgur based image posting (through markdown)

### Changed
- (Client) Removed cloudflare references making hack.chat self-hosted again
- (Client) The way messages are pushed, closing an xss vuln in PRs 985dd6f and 9fcb235
- (Client) Side bar layout
- (Client) Fixed some options not storing
- (Client) Fixed firefox drop down menu bug
- (Client) Updated Katex lib

### Stretched
- The term "minimal"

## [2.1.9 pre 2.2] - 2019-03-18
### Changed
- Configuration script setup, making it more portable/sane
- Refactored naming scheme and entry point

### Removed
- Configuration setup from `./serverLib/ConfigManager`
- Unused feature allowing command modules to add to the configuration/setup process
- `deasync` dependency

## [2.1.9] - 2019-02-21
### Added
- `./server/src/commands/core/emote.js` module to provide action text
- `./server/src/core/server.js` priorities to command hooking
- Priority levels to all command modules
- `./server/src/commands/core/chat.js` Unknown '/' commands will now return a warning
- `./server/src/commands/internal/legacylayer.js` to provide compatibility to legacy connections

### Changed
- Updated all libraries to latest
- `./server/src/core/server.js` Removed unneeded function bindings
- `./server/src/core/server.js` Hook function layout
- `./server/src/managers/config.js` Documentation wording

## [2.1.0] - 2018-09-29
### Added
- Module hook framework, isolating modules and making them truly drop-to-install
- `./server/src/commands/core/whisper.js` module to send in-channel private messages, `/whisper` hook
- `muzzle` and `mute` aliases to `./server/src/commands/mod/dumb.js`
- `unmuzzle` and `unmute` aliases to `./server/src/commands/mod/speak.js`
- `./server/src/commands/admin/removemod.js` module to remove mods
- `./server/src/commands/mod/unbanall.js` module to clear all bans and ratelimiting

### Changed
- Further code cleanup on all modules
- Adjusted `ipSalt` entropy
- `./server/src/commands/core/help.js` output is now helpful, added `/help` hook
- `./server/src/commands/core/chat.js` added `/myhash` and `/me` hooks
- `./server/src/commands/core/morestats.js` added `/stats` hook

## [2.0.3] - 2018-06-03
### Added
- `./server/src/commands/mod/dumb.js` module for server-wide shadow muting
- `./server/src/commands/mod/speak.js` module unmuting
- `./server/src/commands/internal/socketreply.js` module to route warning to clients
- `./server/src/commands/core/ping.js` module to prevent `didYouMean` errors on legacy sources

### Changed
- Moved `disconnect.js` into servers internal modules directory
- Restructured `server.js` and `commands.js`, removing hardcoded protocol use

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
