/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Give da boot
  * @version 1.0.0
  * @description Silently forces target client(s) into another channel
  * @module kick
  */

import {
  isChannelModerator,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  Errors,
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

  // check user input
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'string') {
      if (typeof payload.nick !== 'object' && !Array.isArray(payload.nick)) {
        return true;
      }
    }

    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  } else if (typeof payload.userid !== 'number') {
    // @todo create multi-ban ui
    if (typeof payload.userid !== 'object' && !Array.isArray(payload.userid)) {
      if (typeof payload.nick !== 'string') {
        return true;
      }
    }
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
  for (let i = 0, j = badClients.length; i < j; i += 1) {
    if (badClients[i].level >= socket.level) {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other users with the same level, how rude',
        id: Errors.Global.PERMISSION,
        channel: socket.channel, // @todo Multichannel
      }, socket);
    } else {
      kicked.push(badClients[i]);
    }
  }

  if (kicked.length === 0) {
    return true;
  }

  let destChannel;
  if (typeof payload.to === 'string' && !!payload.to.trim()) {
    destChannel = payload.to;
  } else {
    destChannel = Math.random().toString(36).substr(2, 8);
  }

  // Announce the kicked clients arrival in destChannel and that they were kicked
  // Before they arrive, so they don't see they got moved
  for (let i = 0; i < kicked.length; i += 1) {
    server.broadcast({
      ...getUserDetails(kicked[i]),
      ...{
        cmd: 'onlineAdd',
        channel: destChannel, // @todo Multichannel
      },
    }, { channel: destChannel });
  }

  // Move all kicked clients to the new channel
  for (let i = 0; i < kicked.length; i += 1) {
    // @todo multi-channel update
    kicked[i].channel = destChannel;

    server.broadcast({
      cmd: 'info', // @todo Add numeric info code as `id`
      text: `${kicked[i].nick} was banished to ?${destChannel}`,
      channel: socket.channel, // @todo Multichannel
    }, { channel: socket.channel, level: isChannelModerator });

    console.log(`${socket.nick} [${socket.trip}] kicked ${kicked[i].nick} in ${socket.channel} to ${destChannel} `);
  }

  // broadcast client leave event
  for (let i = 0, j = kicked.length; i < j; i += 1) {
    server.broadcast({
      cmd: 'onlineRemove',
      userid: kicked[i].userid,
      nick: kicked[i].nick,
      channel: socket.channel, // @todo Multichannel
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `Kicked ${kicked.map((k) => k.nick).join(', ')}`,
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

    // If there is no trip parameter
    if (!input[1]) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to kick: Missing name. Refer to `/help kick` for instructions on how to use this command.',
        id: 111111, // Errors.SetLevel.BAD_TRIP,
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
        nick: input[1],
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
    Text: /kick <target nick>`,
};
