/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Unban a user
  * @version 1.0.0
  * @description Un-bans target user by ip or hash
  * @module unban
  */

import {
  isModerator,
} from '../utility/_UAC.js';
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
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  // check user input
  if (typeof payload.ip !== 'string' && typeof payload.hash !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: "hash:'targethash' or ip:'1.2.3.4' is required",
      id: Errors.Users.BAD_HASH_OR_IP,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // find target
  let mode;
  let target;
  if (typeof payload.ip === 'string') {
    mode = 'ip';
    target = payload.ip;
  } else {
    mode = 'hash';
    target = payload.hash;
  }

  // remove arrest record
  server.police.pardon(target);

  // mask ip if used
  if (mode === 'ip') {
    target = server.getSocketHash(target);
  }
  console.log(`${socket.nick} [${socket.trip}] unbanned ${target} in ${socket.channel}`);

  // reply with success
  server.reply({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `Unbanned ${target}`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `${socket.nick}#${socket.trip} unbanned: ${target}`,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  // stats are fun
  core.stats.decrement('users-banned');

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} unban/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'unban',
  category: 'moderators',
  description: 'Un-bans target user by ip or hash',
  usage: `
    API: { cmd: 'unban', ip/hash: '<target ip or hash>' }`,
};
