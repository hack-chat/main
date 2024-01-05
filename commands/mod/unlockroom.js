/* eslint no-console: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Unlock target channel
  * @version 1.0.0
  * @description Unlocks a channel allowing anyone to join
  * @module unlockroom
  */

import {
  isModerator,
} from '../utility/_UAC.js';

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
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  let targetChannel;

  if (typeof payload.channel !== 'string') {
    if (typeof socket.channel !== 'string') { // @todo Multichannel
      return false; // silently fail
    }

    targetChannel = socket.channel;
  } else {
    targetChannel = payload.channel;
  }

  if (!core.locked[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Channel is not locked.',
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  core.locked[targetChannel] = false;

  server.broadcast({
    cmd: 'info',
    text: `Channel: ?${targetChannel} unlocked by [${socket.trip}]${socket.nick}`,
    channel: targetChannel, // @todo Multichannel, false for global info
  }, { channel: targetChannel, level: isModerator });

  console.log(`Channel: ?${targetChannel} unlocked by [${socket.trip}]${socket.nick} in ${socket.channel}`);

  return true;
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
