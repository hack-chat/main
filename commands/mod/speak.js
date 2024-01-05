/* eslint no-param-reassign: 0 */

/**
  * @author OpSimple ( https://github.com/OpSimple )
  * @summary Unmuzzle a user
  * @version 1.0.0
  * @description Pardon a dumb user to be able to speak again
  * @module speak
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
export function init(core) {
  if (typeof core.muzzledHashes === 'undefined') {
    core.muzzledHashes = {};
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

  // check user input
  if (typeof payload.ip !== 'string' && typeof payload.hash !== 'string') {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: "hash:'targethash' or ip:'1.2.3.4' is required",
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (typeof payload.ip === 'string') {
    if (payload.ip === '*') {
      core.muzzledHashes = {};

      return server.broadcast({
        cmd: 'info',
        text: `${socket.nick} unmuzzled all users`,
        channel: false, // @todo Multichannel, false for global
      }, { level: isModerator });
    }
  } else if (payload.hash === '*') {
    core.muzzledHashes = {};

    return server.broadcast({
      cmd: 'info',
      text: `${socket.nick} unmuzzled all users`,
      channel: false, // @todo Multichannel, false for global
    }, { level: isModerator });
  }

  // find target & remove mute status
  let target;
  if (typeof payload.ip === 'string') {
    target = server.getSocketHash(payload.ip);
  } else {
    target = payload.hash;
  }

  delete core.muzzledHashes[target];

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unmuzzled : ${target}`,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} speak/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {Array} aliases - An array of alternative cmd names
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'speak',
  category: 'moderators',
  description: 'Pardon a dumb user to be able to speak again',
  aliases: ['unmuzzle', 'unmute'],
  usage: `
    API: { cmd: 'speak', ip/hash: '<target ip or hash>' }`,
};
