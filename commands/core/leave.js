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
  // check for spam
  if (server.police.frisk(socket, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are leaving channels too fast. Wait a moment and try again.',
      id: Errors.Global.RATELIMIT,
      channel: false,
    }, socket);
  }

  // check for required payload data
  if (typeof payload.channel !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid channel specified.',
      id: Errors.Global.INVALID_PAYLOAD,
      channel: false,
    }, socket);
  }

  const { channel } = payload;

  // verify the user is actually in the channel they are trying to leave
  if (!socket.channels || !socket.channels.includes(channel)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are not in that channel.',
      id: Errors.Global.INVALID_PAYLOAD,
      channel: false,
    }, socket);
  }

  socket.channels = socket.channels.filter((c) => c !== channel);

  // @todo Multichannel update
  if (socket.channel === channel) {
    socket.channel = socket.channels.length > 0 ? socket.channels[0] : undefined;
  }

  const isDuplicate = socketInChannel(server, channel, socket);

  if (isDuplicate === false) {
    server.broadcast({
      cmd: 'onlineRemove',
      nick: socket.nick,
      userid: socket.userid,
      channel,
    }, { channel });
  }

  server.reply({
    cmd: 'session',
    restored: false,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
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

  if (payload.text.startsWith('/leave')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'leave',
        channel: socket.channel, // @todo Mutlichannel
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
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'leave',
  category: 'core',
  description: 'Leave the target channel',
  usage: `
    API: { cmd: 'leave', channel: '<target channel>' }`,
};
