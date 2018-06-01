You can programmatically access hack.chat using the following commands via a websocket. A list of wrappers written for accessing hack.chat can be found [here](https://github.com/hack-chat/3rd-party-software-list#libraries).

The commands are to be sent through a websocket to the URL `wss://hack.chat/chat-ws` (everything sent and received are JSON). If you are sending messages locally or to another domain, replace 'hack.chat' with the respective domain. If you're running your own instance of hack.chat, you can retain backwards-compatibility in order to ensure that software created for the main server will work on yours too.

All commands sent must be JSON objects with the command specified in the `"cmd"` key. For example:
```json
{
    "cmd": "join",
    "channel": "programming",
    "nick": "john#doe"
}
```

hack.chat has three permission levels. When you access a command, hack.chat automatically knows your permission level from your trip code. The lowest permission level is `user`. `mod` is above `user`, so it can access `user` commands in addition to `mod` commands. `admin` is similarly above `mod`.

# `user`

|Command|Parameters|Explanation|
|-------|----------|-----------|
|`changenick`|`nick`|Changes the current connection's nickname.|
|`chat`|`text`|This broadcasts `text` to the channel the user is connected to.|
|`disconnect`||An event handler or forced disconnect.|
|`invite`|`nick`|Generates a pseudo-unique channel name and passes it to both the calling user and `nick`.|
|`join`|`channel`, `nick`|Places the calling socket into the target channel with the target nick and broadcasts the event to the channel.|
|`morestats`||Sends back the current server's stats to the calling client.|
|`move`|`channel`|This will change the current channel to `channel`.|
|`stats`||Sends back legacy server stats to the calling client. Use `morestats` when possible.|
|`help`|`category` or `command`|Gives documentation programmatically. If `category` (the permission level, such as `mod`) is sent, a list of commands available to that permission level will be sent back (as a `string` and not an `array`). This list only includes what is unique to that category and not every command a user with that permission level could perform. If `command` (e.g., `chat`) is sent, a description of the command will be sent back.|

# `mod`

|Command|Parameters|Explanation|
|-------|----------|-----------|
|`ban`|`nick`|Disconnects the target nickname in the same channel as the calling socket and adds it to the rate limiter.|
|`kick`|`nick`|Silently forces target client(s) into another channel. `nick` may be `string` or `array` of `string`s.|
|`unban`|`ip` or `hash`|Removes the target ip from the rate limiter.|
|`dumb`|`nick`|Mutes a user's (spammer's) texts such that it is displayable to the user only.|
|`speak`|`ip` or `hash`|Unmutes the user's (spammer's) texts and makes it displayable to everyone again.|

# `admin`

|Command|Parameters|Explanation|
|-------|----------|-----------|
|`addmod`|`nick`|Adds the target trip to the config as a mod and upgrades the socket type.|
|`listusers`||Outputs all current channels and sockets in those channels.|
|`reload`||(Re)loads any new commands into memory and outputs errors, if any.|
|`saveconfig`||Saves the current config.|
|`shout`|`text`|Displays the passed text to each client connected.|
