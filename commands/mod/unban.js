/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Unban a user
  * @version 1.1.0
  * @description Unbans target user by IP or hash
  * @module unban
  */

import {
  isModerator,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
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

  // determine target type
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

  // mask ip for broadcast
  if (mode === 'ip') {
    target = server.getSocketHash(target);
  }

  console.log(`${socket.nick} [${socket.trip}] unbanned ${target} in ${targetChannel}`);

  // notify moderators
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unbanned: ${target}`,
    id: Info.Mod.UNBANNED_DETAILED,
    args: {
      nick: socket.nick,
      trip: socket.trip,
      target,
    },
    channel: targetChannel,
  }, (client) => isModerator(client));

  // update ban stats
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
  description: 'Unbans target user by IP or hash',
  usage: `
    API: { cmd: 'unban', ip/hash: '<target ip or hash>' }`,
};
