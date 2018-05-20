You can programmatically access hack.chat using the following commands via a websocket. A list of wrappers written for  hack.chat can be found at the [3rd party software list repository](https://github.com/hack-chat/3rd-party-software-list#libraries).

The commands are to be sent through a websocket to the URL `wss://hack.chat/chat-ws`. If you are sending messages locally or to another domain, replace 'hack.chat' with the respective domain. Everything sent and recieved is JSON.

Sending commands (as documented in [the input section](#Input)) will trigger a response. Responses may also be recieved when someone else's client sends a command relating to you, such as inviting you to a channel. Responses are documented in [the output section](#Output) with a `"name"` column, indicating which command would've triggered it to be sent (e.g., sending an 'addmod' command would result in your client, and other clients, recieving an 'addmod' response).

Since hack.chat is an anonymous chatting site, you can use a trip code to identify yourself on each visit to prevent impersonation. Simply enter your passphrase after a pound sign in your nickname (e.g., john#doe instead of john). Furthermore, nicknames must:
- be no longer than 24 characters
- comprise of letters and/or numbers and/or underscores
- not be the admin's name
- not be the same as a nickname already in the channel connecting to

New commands can be created, by using [this template](templateCommand.js).

There are three permission levels. When you send a command, hack.chat knows your permission level from your trip code. The lowest permission level is `user`. `mod` is above `user`, so it can access `user` commands in addition to `mod` commands. `admin` is similarly above `mod`. There can only be one admin.

# Input 

|Access Level|`"cmd"`|Additional Fields (Data type of actual argument)|Explanation|Example|
|------------|-------|-----------------|-----------|-------|
|`user`|`"changenick"`|`"nick"` (`string`)|Changes the current connection's nickname to the one specified in `"nick"`.|`{"cmd": "changenick", "nick": "njQ3Cz"}`|
|`user`|`"chat"`|`"text"` (`string`)|This broadcasts the value of `"text"` to the channel the user is connected to.|`{"cmd": "chat", "text": "hi!"}`|
|`user`|`"disconnect"`||Forcefully disconnects.|`{"cmd": "disconnect"}`|
|`user`|`"invite"`|`"nick"` (`string`)|Generates a pseudo-unique channel name and passes it to both the caller and callee (specified in `"nick"`).|`{"cmd": "invite", "nick": "john"}`|
|`user`|`"join"`|`"channel"` (`string`), `"nick"` (`string`)|Places the calling socket into the target channel (specified in `"channel"`) with the target nickname (specified in `"nick"`).|`{"cmd": "join", "channel": "programming", "nick": "harry"}`|
|`user`|`"morestats"`||Requests the server's stats.|`{"cmd": "morestats"}`|
|`user`|`"move"`|`"channel"` (`string`)|This will change the current channel to the new one (specified in `"channel"`).|`{"cmd": "move", "channel": "botDev"}`|
|`user`|`"stats"`||This command exists for backwards-compaitbility. Use the 'morestats' command instead.|`{"cmd": "stats"}`|
|`user`|`"help"`|`"category"` (`string`)|This programmatically requests the list of commands exclusive to the permission level specified in `"category"`.|`{"cmd": "help", "category": "mod"}`|
|`user`|`"help"`|`"command"` (`string`)|This programmatically requests a description of the command specified in `"command"`.|`{"cmd": "help", "command": "chat"}`|
|`mod`|`"ban"`|`"nick"` (`string`)|Disconnects the user having the nickname specified in `"nick"` and prevents them from joining for the next twenty-four hours.|`{"cmd": "ban", "nick": "neelkamath"}`|
|`mod`|`"kick"`|`"nick"` (`array` of `string`s)|Silently forces users (specified in `"nick"`) into another channel.|`{"cmd": "kick", "nick": "bob_the_builder"}`|
|`mod`|`"unban"`|`"ip"` (`string`)|Unbans a user based with the IP address specified in `"ip"`.|`{"cmd": "unban", "ip": "217.23.3.92"}`|
|`mod`|`"unban"`|`"hash"` (`string`)|Unbans a user having the hash specified in `"hash"`.|`{"cmd": "unban", "hash": "d04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa"}`|
|`admin`|`"addmod"`|`"nick"` (`string`)|Upgrades the user having the nickname specified in `"nick"` to the `mod` permission level.|`{"cmd": "addmod", "nick": "M4GNV5"}`|
|`admin`|`"listusers"`||Outputs all the current channels and their users.|`{"cmd": "listusers"}`|
|`admin`|`"reload"`||(Re)loads any new commands into memory and outputs errors, if any.|`{"cmd": "reload"}`|
|`admin`|`"saveconfig"`||Saves the current config.|`{"cmd": "saveconfig"}`|
|`admin`|`"shout"`|`"text"` (`string`)|Displays what is specified in `"text"` to each user.|`{"cmd": "shout", "text": "hack.chat will be offline for the next 2 hours to update stuff"}`|

# Output

|`"name"`|`"cmd"`|Additional Fields (Data type of formal parameter)|Explanation|Sendees|Example|
|-------|--------|-----------------|-----------|-------|-------|
|`"addmod"`|`"info"`|`"text"` (`string`)|`"text"` contains the text explaining to the new mod that they are now a mod.|The new mod.|`{"cmd": "info", "name": "addmod", "text": "You are now a mod."}`|
|`"addmod"`|`"info"`|`"text"` (`string`)|`"text"` contains information for informing mods that their is a new mod.|All mods.|`{"cmd": "info", "name": "addmod", "text": "Added mod trip: njQ3Cz"}`|
|`"listusers"`|`"info"`|`"text"` (`string`)|`"text"` has a list of all the users in all the channels.|The admin.|`{"cmd": "info", "name": "listusers", "text": "?programming wwandrew, neelkamath, Rut\n?lobby bacon, notrut, Zed"}`|
|`"reload"`|`"info"`|`"text"` (`string`)|`"text"` contains errors due to the reload (if any).|The sendee and all the mods.|`{"cmd": "info", "name": "reload", "text": "Loaded 2 commands, 0 errors"}`|
|`"saveconfig"`|`"warn"`|`"text"` (`string`)|`"text"` contains information as to why the config couldn't save.|The sendee.|`{"cmd": "warn", "name": "saveconfig", "text": "Failed to save config, check logs."}`|
|`"saveconfig"`|`"info"`|`"text"` (`string`)|`"text"` contains information on how the config was successfully saved.|The sendee and all the mods.|`{"cmd": "info", "name": "saveconfig", "text": "Config saved!"}`|
|`"shout"`|`"info"`|`"text'` (`string`)|Sends the value specified in `"text"` to each user.|Each client.|`{"cmd": "info", "name": "shout", "text": "Server Notice: hack.chat will be offline on Tuesday because I said so"}`|
|`"changenick"`|`"warn"`|`"text"` (`string`)|`"text"` contains the information as to why you cannot change your nick to the new one.|The sendee.|`{"cmd": "warn", "name": "changenick", "text": "You are changing nicknames too fast. Wait a moment before trying again."}`|
|`"changenick"`|`"onlineRemove"`|`"nick"` (`string`)|The user specified in `"nick"` is attempting to rejoin under a new nickname.|Every user in the channel connected to.|`{"cmd": "onlineRemove", "name": "changenick", "nick": "malfoy"}`|
|`"changenick"`|`"onlineAdd"`|`"nick"` (`string`), `"trip"` (`string` or `null`), `"hash"` (`string`)|A user has reconnected under a new nickname. `"nick"` specifies the new nickname, `"trip"` holds the user's trip code (if they don't have one, it'll be `null`), and `"hash"` holds a SHA256 sum to uniquely identify the individual.|Every user in the channel connected to.|`{"cmd": "onlineAdd", "name": "changenick", "nick": "ron", "trip": null, "hash": "d04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa"}`|
|`"changenick"`|`"info"`|`"text'` (`string`)|`"text"` holds the information necessary for notifying users that a user has reconnected with a new nickname.|Everyone in the channel of the user.|`{"cmd": "info", "name": "changenick", "text": "andy is now andrew"}`|
|`"chat"`|`"warn"`|`"text"` (`string`)|`"text"` contains information explaining why your message wasn't sent.|The sendee.|`{"cmd": "warn", "name": "chat", "text": "You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message."}`|
|`"chat"`|`"chat"`|`"nick"` (`string`), `"text"` (`string`), `"admin"` (`bool` or `undefined`), `"mod"` (`bool` or `undefined`)|The new message (specified in `"text"`) in the channel connected to from the user specified in `"nick"`. `"admin"` or `"mod"` will be `true` if the message was sent from a user with that permission level, otherwise they will not be in the packet.|Everyone in the channel messaged in.|`{"cmd": "chat", "name": "chat", "nick": "raf924", "text": "no", "mod": true}`|
|`"disconnect"`|`"onlineRemove"`|`"nick"` (`string`)|The user specified in `"nick"` forced a disconnect for themselves.|Every user in the channel in question.|`{"cmd": "onlineRemove", "name": "disconnect", "nick": "neelkamath"}`|
|`"help"`|`"info"`|`"text"` (`string`)|An explanation.|The sendee.|`{"cmd": "info", "name": "help", "text": "Event handler or force disconnect (if your into that kind of thing)"}`|
|`"invite"`|`"warn"`|`"text"` (`string`)|`"text"` contains an explanation on why your invite wasn't sent.|The sendee.|`{"cmd": "warn", "name": "invite", "text": "You are sending invites too fast. Wait a moment before trying again."}`|
|`"join"`|`"warn"`|`"text"` (`string`)|`"text"` contains an explanation for why you couldn't join a channel.|The sendee.|`{"cmd": "warn", "name": "join", "text": "You are joining channels too fast. Wait a moment and try again."}`|
|`"join"`|`"onlineAdd"`|`"nick"` (`string`), `"trip"` (`string` or `null`), `"hash"` (`string`)|A user (specified in `"nick"`) with the trip code specified in `"trip"` (if non-existent, this will be `null`) joined the channel with the SHA256 sum specified in `"hash"`.|Everyone in that channel.|`{"cmd": "onlineAdd", "name": "join", "nick": "neelkamath", "trip": "null", hash: "d04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa"}`|
|`"join"`|`"onlineSet"`|`"nicks"` (`array` of `string`s)|`"nicks"` contains each user's nickname in the channel connected to.|The sendee.|`{"cmd": "onlineSet", "name": "join", "nicks": ["neel", "Porygon"]}`|
|`"morestats"`|`"info"`|`"text"` (`string`)|The new server's statistics (specified in `"text"`).|The sendee.|`{"cmd": "info", "name": "morestats", "text": "current-connections: 20\ncurrent-channels: 3\nusers-joined: 0\ninvites-sent: 2\nmessages-sent: 4\nusers-banned: 5\nusers-kicked: 1\nstats-requested: 0\nserver-uptime: 7"}`|
|`"move"`|`"warn"`|`"text"` (`string`)|An explanation of why you weren't allowed to switch channels (specified in `"text"`).|The sendee.|`{"cmd": "warn", "name": "move", "text": "You are changing channels too fast. Wait a moment before trying again."}`|
|`"move"`|`"onlineRemove"`|`"nick"` (`string`)|States that the user (specified in `"nick"`) has left the channel.|Each user in the channel.|`{"cmd": "onlineRemove", "name": "move", "nick": "neelkamath"}`|
|`"move"`|`"onlineAdd"`|`"nick"` (`string`), `"trip"` (`string` or `null`), `"hash"` (`string`)|The user (specified in `"nick"`) with the trip code specified in `"trip"` (this will be `null` if there isn't one) has joined the channel. The hash specified in `"hash"` can be used to uniquely identify this individual.|Each user in the channel connected to.|`{"cmd": "onlineAdd", "name": "move", "nick": "volie_moldie", "hash": "d04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa"}`|
|`"move"`|`"onlineSet"`|`"nicks"` (`array` of `string`s)|`"nicks"`contains the nicknames present in the channel.|Each user in the channel.|`{"cmd": "onlineSet", "name": "move", "nicks": ["neel", "Porygon", "Xen0"]}`|
|`"stats"`|`"info"`|`"text"`|`"text"` contains the stats for the server.|The sendee.|`{"cmd": "info", "name": "stats", "text": "69 unique IPs in 7 channels"}`|
|`"ban"`|`"warn"`|`"text"` (`string`)|An explanation is specified in `"text"` for as to why the user couldn't be banned.|The sendee.|`{"cmd": "warn", "name": "ban", "text": "Could not find user in channel"}`|
|`"ban"`|`"info"`|`"text"` (`string`)|`"text"` holds information required to notify users of the ban.|Each client connected to the channel in which the user was banned in and all the mods everywhere.|`{"cmd": "info", "name": "ban", "text": "Banned neelkamath"}`|
|`"kick"`|`"warn"`|`"text"` (`string`)|An explanation as to why the kick failed is specified in `"text"`.|The sendee.|`{"cmd": "warn", "name": "kick", "text": "Could not find user(s) in channel"}`|
|`"kick"`|`"info"`|`"text"` (`string`)|A notification about the kicked user in specified in `"text"`.|All the mods in the channel in which the kick occurred.|`{"cmd": "info", "name": "kick", "text": "neelkamath was banished to ?m9bjmnnd"}`|
|`"kick"`|`"onlineRemove"`|`"nick"` (`string`)|`"nick"` specifies the user who has left the channel.|Each user in the channel in question.|`{"cmd": "onlineRemove", "name": "kick", "nick": "neelkamath"}`|
|`"kick"`|`"info"`|`"text"` (`string`)|An explanation of the kick (specified in `"text"`).|Each user in the channel in which a user was kicked in.|`{"cmd": "info", "name": "kick", "text": "Kicked neelkamath, Porygon, toilet_master"}`|
|`"unban"`|`"warn"`|`"text"` (`string`)|An explanation of why the unban was unsuccessful isspecified in `"text"`.|The sendee.|`{"cmd": "warn", "name": "unban", "text": "hash:'targethash' or ip:'1.2.3.4' is required"}`|
|`"unban"`|`"info"`|`"text"` (`string`)|`"text"` holds information on the unban's success.|The sendee.|`{"cmd": "info", "name": "unban", "text": "Unbanned neelkamath"}`|
|`"unban"`|`"info"`|`"text"` (`string`)|`"text"` holds information on the unban's success.|All mods.|`{"cmd": "info", "name": "unban", "text": "marzavec unbanned neelkamath"}`|