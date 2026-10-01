/* eslint no-param-reassign: 0 */

/**
  * @author OpSimple ( https://github.com/OpSimple )
  * @summary Unmuzzle a user
  * @version 1.1.0
  * @description Pardon a muted user so they can speak again
  * @module speak
  */

import {
  isModerator,
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
export function init(core) {
  // initialize muzzle list if missing
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
  // enforce moderation level
  if (!isModerator(socket)) {
    return server.police.frisk(socket, 10);
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 10);
  }

  // check user input
  if (typeof payload.ip !== 'string' && typeof payload.hash !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: "hash:'targethash' or ip:'1.2.3.4' is required",
      id: Errors.Users.BAD_HASH_OR_IP,
      channel: targetChannel,
    }, socket);
  }

  // handle global unmuzzle wildcard
  if (typeof payload.ip === 'string') {
    if (payload.ip === '*') {
      core.muzzledHashes = {};

      return server.broadcast({
        cmd: 'info',
        text: `${socket.nick} unmuzzled all users`,
        id: Info.Mod.UNMUZZLED_ALL,
        args: { nick: socket.nick },
        channel: targetChannel,
      }, (client) => isModerator(client));
    }
  } else if (payload.hash === '*') {
    core.muzzledHashes = {};

    return server.broadcast({
      cmd: 'info',
      text: `${socket.nick} unmuzzled all users`,
      id: Info.Mod.UNMUZZLED_ALL,
      args: { nick: socket.nick },
      channel: targetChannel,
    }, (client) => isModerator(client));
  }

  // find target and remove mute status
  let target;
  if (typeof payload.ip === 'string') {
    target = server.getSocketHash(payload.ip);
  } else {
    target = payload.hash;
  }

  delete core.muzzledHashes[target];

  // notify moderators in the channel
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unmuzzled: ${target}`,
    id: Info.Mod.UNMUZZLED_DETAILED,
    args: {
      nick: socket.nick,
      trip: socket.trip,
      target,
    },
    channel: targetChannel,
  }, (client) => {
    const inChannel = (client.channels && client.channels.includes(targetChannel));
    return inChannel && isChannelModerator(client, targetChannel);
  });

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
  description: 'Pardon a muted user so they can speak again',
  aliases: ['unmuzzle', 'unmute'],
  usage: `
    API: { cmd: 'speak', ip/hash: '<target IP or hash>' }`,
};
