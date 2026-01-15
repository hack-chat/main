/* eslint no-unused-vars: 0 */
/* eslint no-restricted-syntax: 0 */
/* eslint guard-for-in: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Show users and channels
  * @version 1.1.0
  * @description Outputs all current channels and sockets in those channels
  * @module listusers
  */

import {
  Info,
} from '../utility/_Constants.js';
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
    channel: () => true,
  });

  const channels = {};
  for (let i = 0, j = currentUsers.length; i < j; i += 1) {
    const user = currentUsers[i];
    if (typeof channels[user.channel] === 'undefined') {
      channels[user.channel] = [];
    }

    channels[user.channel].push(user);
  }

  const channelList = Object.keys(channels).map((name) => ({
    name,
    users: channels[name],
    count: channels[name].length,
  }));

  channelList.sort((a, b) => b.count - a.count);

  let reply = '| Channel | Trip | Nick | Hash |\n';
  reply += '| :--- | :--- | :--- | :--- |\n';

  for (let i = 0; i < channelList.length; i += 1) {
    const { name, users } = channelList[i];

    for (let k = 0; k < users.length; k += 1) {
      const u = users[k];
      const trip = u.trip || '(none)';
      const hash = u.hash || '???';

      reply += `| ?${name} | ${trip} | ${u.nick} | ${hash} |\n`;
    }
  }

  reply += '\n---\n';
  reply += `**Total Channels:** ${channelList.length}\n`;
  reply += `**Total Users:** ${currentUsers.length}`;

  // send reply
  server.reply({
    cmd: 'info',
    text: reply,
    id: Info.Admin.USER_LIST,
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
