/* eslint no-console: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Unlock target channel
  * @version 1.1.0
  * @description Unlocks a channel allowing anyone to join
  * @module unlockroom
  */

import {
  isChannelModerator,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  if (typeof core.locked === 'undefined') {
    core.locked = {};
  }
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isChannelModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  const targetChannel = socket.channel;

  if (typeof core.locked[targetChannel] === 'undefined' || core.locked[targetChannel] === false) {
    return server.reply({
      cmd: 'warn',
      text: 'Channel is not locked.',
      id: Errors.Global.INVALID_DATA,
      channel: targetChannel, // @todo Multichannel
    }, socket);
  }

  if (core.locked[targetChannel] > socket.level) {
    return server.reply({
      cmd: 'warn',
      text: `Level ${core.locked[targetChannel]} required, you are level ${socket.level}`,
      id: Errors.LockRoom.LEVEL_REQUIRED,
      channel: targetChannel, // @todo Multichannel
    }, socket);
  }

  core.locked[targetChannel] = false;

  server.broadcast({
    cmd: 'info',
    text: `Channel: ?${targetChannel} unlocked by [${socket.trip}]${socket.nick}`,
    id: Info.Mod.UNLOCKED_DETAILED,
    channel: targetChannel, // @todo Multichannel
  }, { channel: targetChannel, level: isChannelModerator });

  console.log(`Channel: ?${targetChannel} unlocked by [${socket.trip}]${socket.nick}`);

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 4);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hook incoming chat commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/unlockroom')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'unlockroom',
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} unlockroom/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'unlockroom',
  category: 'moderators',
  description: 'Unlock the current channel you are in or target channel as specified',
  usage: `
    API: { cmd: 'unlockroom', channel: '<optional target channel>' }`,
};
