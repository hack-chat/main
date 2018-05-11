You can programmatically access hack.chat using the following commands.

hack.chat has three permission levels. When you access a command, hack.chat automatically knows your permission level from your trip code. The lowest permission level is `core`. `mod` is above `core`, so it can access `core` commands in addition to `mod` commands. `admin` is similarly above `mod`.

# `core`

|Command|Parameters|Explanation|
|-------|----------|-----------|
|`changenick`|`nick`|This will change your current connections nickname|
|`chat`|`text`|Broadcasts passed `text` field to the calling users channel|
|`disconnect`||Event handler or force disconnect (if your into that kind of thing)|
|`help`|`type` or `category`, `command`|Outputs information about the servers current protocol|
|`invite`|`nick`|Generates a unique (more or less) room name and passes it to two clients|
|`join`|`channel`, `nick`|Place calling socket into target channel with target nick & broadcast event to channel|
|`morestats`||Sends back current server stats to the calling client|
|`move`|`channel`|This will change the current channel to the new one provided|
|`showcases`|`echo`|Simple command module template & info|
|`stats`||Sends back legacy server stats to the calling client|

# `mod`

|Command|Parameters|Explanation|
|-------|----------|-----------|
|`ban`|`nick`|Disconnects the target nickname in the same channel as calling socket & adds to ratelimiter|
|`kick`|`nick`|Silently forces target client(s) into another channel. `nick` may be string or array of strings|
|`unban`|`ip` or `hash`|Removes target ip from the ratelimiter|

# `admin`

|Command|Parameters|Explanation|
|-------|----------|-----------|
|`addmod`|`nick`|Adds target trip to the config as a mod and upgrades the socket type|
|`listusers`||Outputs all current channels and sockets in those channels|
|`reload`||(Re)loads any new commands into memory, outputs errors if any|
|`saveconfig`||Saves current config|
|`shout`|`text`|Displays passed text to every client connected|