/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Give da boot
  * @version 1.1.0
  * @description Silently forces target client(s) into another channel
  * @module kick
  */

import {
  isModerator,
  isChannelModerator,
  getUserDetails,
  getUserLevel,
  levels,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  findUsers,
} from '../utility/_Channels.js';
import {
  getSession,
} from '../core/session.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 10);
  }

  const requestLevel = getUserLevel(socket, targetChannel);

  // enforce moderator rank
  if (requestLevel < levels.channelModerator) {
    return server.police.frisk(socket, 10);
  }

  if (socket.hcProtocol === 1) {
    payload.channel = targetChannel; // eslint-disable-line no-param-reassign
  }

  // check user input
  const hasValidNick = typeof payload.nick === 'string' || Array.isArray(payload.nick);
  const hasValidUserid = typeof payload.userid === 'number' || Array.isArray(payload.userid);

  if (!hasValidNick && !hasValidUserid) {
    return true;
  }

  // find target user(s)
  const badClients = findUsers(server, { ...payload, channel: targetChannel });
  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  // check if found targets are kickable, add them to the list if they are
  const kicked = [];
  badClients.forEach((client) => {
    const targetLevel = getUserLevel(client, targetChannel);

    if (targetLevel >= requestLevel) {
      server.reply({
        cmd: 'warn',
        text: 'You may not do that',
        id: Errors.Global.PERMISSION,
        channel: targetChannel,
      }, socket);
    } else {
      kicked.push(client);
    }
  });

  if (kicked.length === 0) {
    return true;
  }

  let destChannel = Math.random().toString(36).substring(2, 8);

  // set optional target destination channel
  if (typeof payload.to === 'string' && !!payload.to.trim()) {
    if (isModerator(socket)) {
      destChannel = payload.to.trim();
    }
  }

  // announce the kicked clients arrival in destChannel and that they were kicked
  // before they arrive, so they don't see they got moved
  kicked.forEach((client) => {
    server.broadcast({
      ...getUserDetails(client, destChannel),
      ...{
        cmd: 'onlineAdd',
        channel: destChannel,
      },
    }, (c) => c.channels && c.channels.includes(destChannel));
  });

  // move all kicked clients to the new channel
  kicked.forEach((client) => {
    // remove from old channel
    if (client.channels) {
      client.channels = client.channels.filter((c) => c !== targetChannel);
    } else {
      client.channels = [];
    }

    if (client.channelStates && client.channelStates[targetChannel]) {
      delete client.channelStates[targetChannel];
    }

    // add to destination channel
    if (!client.channels.includes(destChannel)) {
      client.channels.push(destChannel);
    }

    if (!client.channelStates) client.channelStates = {};
    client.channelStates[destChannel] = {
      level: levels.default,
      trip: client.trip,
    };

    // monkey patch client send to rewrite outgoing packets
    if (!client.hasShadowPatch) {
      const origSend = client.send;
      client.send = function shadowSend(data, ...args) {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            let modified = false;

            if (parsed.channel && client.shadowBans && client.shadowBans[parsed.channel]) {
              parsed.channel = client.shadowBans[parsed.channel];
              modified = true;
            }

            if (parsed.channels && Array.isArray(parsed.channels) && client.shadowBans) {
              parsed.channels = parsed.channels.map((c) => client.shadowBans[c] || c);
              modified = true;
            }

            if (modified) {
              return origSend.call(this, JSON.stringify(parsed), ...args);
            }
          } catch (e) {
            // ignore JSON parse errors
          }
        }
        return origSend.call(this, data, ...args);
      };
      client.hasShadowPatch = true;
    }

    // configure shadow alias map
    if (!client.shadowBans) {
      client.shadowBans = {};
      client.shadowBansInverse = {};
    }
    client.shadowBans[destChannel] = targetChannel;
    client.shadowBansInverse[targetChannel] = destChannel;

    // notify mods of successful kick
    server.broadcast({
      cmd: 'info',
      text: `${client.nick} was banished to ?${destChannel} by ${socket.trip}#${socket.nick}`,
      id: Info.Mod.KICKED_DETAILED,
      args: {
        nick: client.nick,
        destChannel,
        kickerTrip,
        kickerNick,
      },
      channel: targetChannel,
    }, (c) => {
      const inChannel = (c.channels && c.channels.includes(targetChannel));
      return inChannel && isChannelModerator(c, targetChannel);
    });

    console.log(`${socket.nick} [${socket.trip}] kicked ${client.nick} in ${targetChannel} to ${destChannel}`);

    // trigger client-side resync
    server.send({
      cmd: 'session',
      restored: false,
      token: getSession(client, core),
      channels: client.channels,
    }, client);
  });

  // broadcast client leave event to the old channel
  kicked.forEach((client) => {
    server.broadcast({
      cmd: 'onlineRemove',
      userid: client.userid,
      nick: client.nick,
      channel: targetChannel,
    }, (c) => c.channels && c.channels.includes(targetChannel));
  });

  const kickedNames = kicked.map((k) => k.nick).join(', ');

  // publicly broadcast kick event to the old channel
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${kickedNames}`,
    id: Info.Mod.KICKED,
    args: { kickedNames },
    channel: targetChannel,
  }, (c) => c.channels && c.channels.includes(targetChannel));

  // stats are fun
  core.stats.increment('users-kicked', kicked.length);

  return true;
}

/**
  * Executes every time an incoming command is invoked
  * Intercepts incoming payload.channel for kicked users to rewrite it dynamically
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)}
  */
export function incomingShadowCheck({ socket, payload }) {
  if (!payload || !payload.channel) return payload;

  if (payload.cmd === 'join') {
    // rejoining explicitly breaks the shadow alias so they can enter the real room
    if (socket.shadowBansInverse && socket.shadowBansInverse[payload.channel]) {
      const dest = socket.shadowBansInverse[payload.channel];
      delete socket.shadowBansInverse[payload.channel];
      delete socket.shadowBans[dest];
    }
    return payload;
  }

  // rewrite incoming packet to point at the banished destination
  if (socket.shadowBansInverse && socket.shadowBansInverse[payload.channel]) {
    payload.channel = socket.shadowBansInverse[payload.channel];
  }

  return payload;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runKickCheck.bind(this), 29);

  // bind shadow hooks for all communication commands
  const interceptCmds = ['chat', 'emote', 'whisper', 'updateMessage', 'leave', 'changenick', 'join'];
  interceptCmds.forEach((cmd) => {
    server.registerHook('in', cmd, this.incomingShadowCheck.bind(this), 5);
  });
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function runKickCheck({
  core, server, socket, payload,
}) {
  if (!payload || typeof payload.text !== 'string') {
    return false;
  }

  // intercept /kick command
  if (payload.text.startsWith('/kick ')) {
    const input = payload.text.split(' ');

    const nicks = input.slice(1)
      .map((n) => n.replace(/@/g, '').replace(/[^a-zA-Z0-9_]/g, ''))
      .filter((n) => n.length > 0);

    if (nicks.length === 0) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to kick: Missing name. Refer to `/help kick` for instructions on how to use this command',
        id: Errors.Kick.MISSING_NICK,
        channel: payload.channel,
      }, socket);

      return false;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'kick',
        nick: nicks,
        channel: payload.channel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} kick/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'kick',
  category: 'moderators',
  description: 'Silently forces target client(s) into another channel. `nick` may be string or array of strings',
  usage: `
    API: { cmd: 'kick', nick: '<target nick>|[<target nicks>]', to: '<optional target channel>' }
    API: { cmd: 'kick', userid: <target id>|[<target ids>], to: '<optional target channel>' }
    Text: /kick <target nick> [@anotherNick] ...`,
};
