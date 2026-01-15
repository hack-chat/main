/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Released them from the void
  * @version 1.1.0
  * @description Clears all banned ip addresses
  * @module unbanall
  */

import {
  isModerator,
} from '../utility/_UAC.js';
import {
  Info,
} from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ core, server, socket }) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  // remove arrest records
  server.police.clear();

  core.stats.set('users-banned', 0);

  console.log(`${socket.nick} [${socket.trip}] unbanned all`);

  // reply with success
  server.reply({
    cmd: 'info',
    text: 'Unbanned all ip addresses',
    id: Info.Mod.UNBANNED_ALL,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unbanned all ip addresses`,
    id: Info.Mod.UNBANNED_ALL_DETAILED,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} unbanall/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'unbanall',
  category: 'moderators',
  description: 'Clears all banned ip addresses',
  usage: `
    API: { cmd: 'unbanall' }`,
};
