/* eslint no-unused-vars: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint guard-for-in: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Show users and channels
  * @version 1.0.0
  * @description Outputs all current channels and sockets in those channels
  * @module listusers
  */

import {
  isAdmin,
} from '../utility/_UAC.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket }) {
  // increase rate limit chance and ignore if not admin
  if (!isAdmin(socket.level)) {
    return server.police.frisk(socket, 20);
  }

  // find all users currently in a channel
  const currentUsers = server.findSockets({
    channel: (channel) => true,
  });

  // compile channel and user list
  const channels = {};
  for (let i = 0, j = currentUsers.length; i < j; i += 1) {
    if (typeof channels[currentUsers[i].channel] === 'undefined') {
      channels[currentUsers[i].channel] = [];
    }

    channels[currentUsers[i].channel].push(
      `[${currentUsers[i].trip || 'null'}]${currentUsers[i].nick}`,
    );
  }

  // build output
  const lines = [];
  for (const channel in channels) {
    lines.push(`?${channel} ${channels[channel].join(', ')}`);
  }

  // send reply
  server.reply({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: lines.join('\n'),
    channel: socket.channel, // @todo Multichannel
  }, socket);

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} listusers/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'listusers',
  category: 'admin',
  description: 'Outputs all current channels and sockets in those channels',
  usage: `
    API: { cmd: 'listusers' }`,
};
