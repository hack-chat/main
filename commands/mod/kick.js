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
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  findUsers,
} from '../utility/_Channels.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isChannelModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  if (socket.hcProtocol === 1) {
    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  }

  // check user input
  const hasValidNick = typeof payload.nick === 'string' || Array.isArray(payload.nick);
  const hasValidUserid = typeof payload.userid === 'number' || Array.isArray(payload.userid);

  if (!hasValidNick && !hasValidUserid) {
    return true;
  }

  // find target user(s)
  const badClients = findUsers(server, payload);
  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user(s) in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // check if found targets are kickable, add them to the list if they are
  const kicked = [];
  badClients.forEach((client) => {
    if (client.level >= socket.level) {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other users with the same level, how rude',
        id: Errors.Global.PERMISSION,
        channel: socket.channel, // @todo Multichannel
      }, socket);
    } else {
      kicked.push(client);
    }
  });

  if (kicked.length === 0) {
    return true;
  }

  let destChannel = Math.random().toString(36).substr(2, 8);

  if (typeof payload.to === 'string' && !!payload.to.trim()) {
    if (isModerator(socket.level)) {
      destChannel = payload.to.trim();
    }
  }

  // announce the kicked clients arrival in destChannel and that they were kicked
  // before they arrive, so they don't see they got moved
  kicked.forEach((client) => {
    server.broadcast({
      ...getUserDetails(client),
      ...{
        cmd: 'onlineAdd',
        channel: destChannel, // @todo Multichannel
      },
    }, { channel: destChannel });
  });

  // move all kicked clients to the new channel
  kicked.forEach((client) => {
    // @todo multi-channel update
    client.channel = destChannel;

    server.broadcast({
      cmd: 'info',
      text: `${client.nick} was banished to ?${destChannel}`,
      id: Info.Mod.KICKED_DETAILED,
      channel: socket.channel, // @todo Multichannel
    }, { channel: socket.channel, level: isChannelModerator });

    console.log(`${socket.nick} [${socket.trip}] kicked ${client.nick} in ${socket.channel} to ${destChannel} `);
  });

  // broadcast client leave event
  kicked.forEach((client) => {
    server.broadcast({
      cmd: 'onlineRemove',
      userid: client.userid,
      nick: client.nick,
      channel: socket.channel, // @todo Multichannel
    }, { channel: socket.channel });
  });

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${kicked.map((k) => k.nick).join(', ')}`,
    id: Info.Mod.KICKED,
    channel: socket.channel, // @todo Multichannel
  }, { channel: socket.channel, level: (level) => isChannelModerator(level) });

  // stats are fun
  core.stats.increment('users-kicked', kicked.length);

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runKickCheck.bind(this), 29);
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
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/kick ')) {
    const input = payload.text.split(' ');

    const nick = input[1];
    if (!nick || !nick.replace(/[^a-zA-Z0-9_]/g, '')) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to kick: Missing name. Refer to `/help kick` for instructions on how to use this command.',
        id: Errors.Kick.MISSING_NICK,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'kick',
        nick: nick.replace(/[^a-zA-Z0-9_]/g, ''),
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
    API: { cmd: 'kick', nick: '<target nick>', to: '<optional target channel>' }
    API: { cmd: 'kick', userid: <target id>, to: '<optional target channel>' }
    Text: /kick <target nick>`,
};
