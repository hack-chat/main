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
  getUserDetails,
} from '../utility/_UAC.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  // increase rate limit chance and ignore if not admin
  if (!isAdmin(socket)) {
    return server.police.frisk(socket, 20);
  }

  // find all users currently in a channel
  const currentUsers = server.findSockets({
    channels: (channels) => channels && channels.length > 0,
  });

  const channels = {};

  // group active users by channel
  for (let i = 0, j = currentUsers.length; i < j; i += 1) {
    const user = currentUsers[i];

    if (user.channels && Array.isArray(user.channels)) {
      for (let k = 0; k < user.channels.length; k += 1) {
        const chanName = user.channels[k];

        if (typeof channels[chanName] === 'undefined') {
          channels[chanName] = [];
        }

        channels[chanName].push(user);
      }
    }
  }

  const channelList = Object.keys(channels).map((name) => ({
    name,
    users: channels[name],
    count: channels[name].length,
  }));

  // sort by most populated channels
  channelList.sort((a, b) => b.count - a.count);

  // build markdown table output
  let reply = '| Channel | Trip | Nick | Hash |\n';
  reply += '| :--- | :--- | :--- | :--- |\n';

  for (let i = 0; i < channelList.length; i += 1) {
    const { name, users } = channelList[i];

    for (let k = 0; k < users.length; k += 1) {
      const u = users[k];
      const details = getUserDetails(u, name);
      const trip = details.trip || '(none)';
      const hash = details.hash || '???';

      reply += `| ?${name} | ${trip} | ${details.nick} | ${hash} |\n`;
    }
  }

  reply += '\n---\n';
  reply += `**Total Active Channels:** ${channelList.length}\n`;
  reply += `**Total Unique Connections:** ${currentUsers.length}`;

  // send reply to admin
  server.reply({
    cmd: 'info',
    text: reply,
    id: Info.Admin.USER_LIST,
    channel: payload.channel,
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
