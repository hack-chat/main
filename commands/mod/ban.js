/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Ban a user
  * @version 1.0.0
  * @description Bans target user by name
  * @module ban
  */

import {
  isModerator,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  findUser,
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
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  // check user input
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'string') {
      return false;
    }

    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  } else if (typeof payload.userid !== 'number') {
    return false;
  }

  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }
  const targetNick = targetUser.nick;

  // i guess banning mods or admins isn't the best idea?
  if (targetUser.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'Cannot ban other users of the same level, how rude',
      id: Errors.Global.PERMISSION,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // commit arrest record
  server.police.arrest(targetUser.address, targetUser.hash);

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  // notify normal users
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `Banned ${targetNick}`,
    user: getUserDetails(targetUser),
    channel: socket.channel, // @todo Multichannel
  }, { channel: socket.channel, level: (level) => isModerator(level) });

  // notify mods
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `${socket.nick}#${socket.trip} banned ${targetNick} in ${payload.channel}, userhash: ${targetUser.hash}`,
    channel: socket.channel, // @todo Multichannel
    inChannel: payload.channel,
    user: getUserDetails(targetUser),
    banner: getUserDetails(socket),
  }, { level: isModerator });

  // force connection closed
  targetUser.terminate();

  // stats are fun
  core.stats.increment('users-banned');

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} ban/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'ban',
  category: 'moderators',
  description: 'Bans target user by name',
  usage: `
    API: { cmd: 'ban', nick: '<target nickname>' }`,
};
