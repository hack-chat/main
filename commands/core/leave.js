/* eslint no-param-reassign: 0 */
/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Leave target channel
  * @version 1.0.0
  * @description Leave the target channel
  * @module leave
  */

import {
  getSession,
} from './session.js';
import {
  socketInChannel,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';

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
    return server.police.frisk(socket, 1);
  }

  // check for spam
  if (server.police.frisk(socket, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // remove channel from the channels array
  socket.channels = socket.channels.filter((c) => c !== targetChannel);

  // remove channel specific state
  if (socket.channelStates && socket.channelStates[targetChannel]) {
    delete socket.channelStates[targetChannel];
  }

  // check if the user has other connections still in this channel
  const isDuplicate = socketInChannel(server, targetChannel, socket);

  if (isDuplicate === false) {
    server.broadcast({
      cmd: 'onlineRemove',
      nick: socket.nick,
      userid: socket.userid,
      channel: targetChannel,
    }, {
      channels: (targetChannels) => Array.isArray(targetChannels)
        && targetChannels.includes(targetChannel),
    });
  }

  // reply with updated session token
  server.reply({
    cmd: 'session',
    restored: false,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runLeaveCheck.bind(this), 32);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function runLeaveCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  let targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /leave command
  if (payload.text.startsWith('/leave')) {
    const input = payload.text.split(' ');

    if (input[1]) {
      [, targetChannel] = input;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'leave',
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} leave/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Leave the target channel
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'leave',
  category: 'core',
  description: 'Leave the target channel',
  usage: `
    API: { cmd: 'leave', channel: '<target channel>' }`,
};
