/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Release them from the void
  * @version 1.1.0
  * @description Clears all banned IP addresses
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
  * @param {Object} env - Environment object with references to core, server & socket
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket)) {
    return server.police.frisk(socket, 10);
  }

  // remove arrest records
  server.police.clear();

  // reset banned users stat
  core.stats.set('users-banned', 0);

  console.log(`${socket.nick} [${socket.trip}] unbanned all`);

  // notify global moderators
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unbanned all IP addresses`,
    id: Info.Mod.UNBANNED_ALL_DETAILED,
    args: {
      nick: socket.nick,
      trip: socket.trip,
    },
    channel: false,
  }, (client) => isModerator(client));

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
  description: 'Clears all banned IP addresses',
  usage: `
    API: { cmd: 'unbanall' }`,
};
