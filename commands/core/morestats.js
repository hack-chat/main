/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Get stats
  * @version 1.1.0
  * @description Sends back current server stats to the calling client
  * @module morestats
  */

import {
  Info,
} from '../utility/_Constants.js';

/**
  * Format input time into string
  * @param {Date} time - Subject date
  * @private
  * @return {string}
  */
const formatTime = (time) => {
  let seconds = time[0] + time[1] / 1e9;

  let minutes = Math.floor(seconds / 60);
  seconds %= 60;

  let hours = Math.floor(minutes / 60);
  minutes %= 60;

  const days = Math.floor(hours / 24);
  hours %= 24;

  return `${days.toFixed(0)}d ${hours.toFixed(0)}h ${minutes.toFixed(0)}m ${seconds.toFixed(0)}s`;
};

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // gather connection and channel count
  const ips = {};
  const channels = {};
  const publicChanCounts = {};

  if (core.appConfig.data.publicChannels) {
    core.appConfig.data.publicChannels.forEach((channel) => {
      publicChanCounts[channel] = 0;
    });
  }

  // iterate over clients to populate stats
  server.clients.forEach((client) => {
    ips[client.address] = true;

    if (client.channels && Array.isArray(client.channels)) {
      client.channels.forEach((channelName) => {
        channels[channelName] = true;

        if (Object.prototype.hasOwnProperty.call(publicChanCounts, channelName)) {
          publicChanCounts[channelName] += 1;
        }
      });
    }
  });

  // collect formatted output data
  const uniqueClientCount = Object.keys(ips).length;
  const uniqueChannels = Object.keys(channels).length;
  const joins = core.stats.get('users-joined') || 0;
  const invites = core.stats.get('invites-sent') || 0;
  const messages = core.stats.get('messages-sent') || 0;
  const banned = core.stats.get('users-banned') || 0;
  const kicked = core.stats.get('users-kicked') || 0;
  const stats = core.stats.get('stats-requested') || 0;
  const uptime = formatTime(process.hrtime(core.stats.get('start-time')));

  // construct markdown table
  let replyText = '# Server Statistics\n';
  replyText += '| Metric | Value |\n';
  replyText += '| :--- | --- |\n';
  replyText += `|     **Current Connections** | ${uniqueClientCount} |\n`;
  replyText += `|     **Current Channels** | ${uniqueChannels} |\n`;
  replyText += `|     **Users Joined** | ${joins} |\n`;
  replyText += `|     **Invites Sent** | ${invites} |\n`;
  replyText += `|     **Messages Sent** | ${messages} |\n`;
  replyText += `|     **Users Banned** | ${banned} |\n`;
  replyText += `|     **Users Kicked** | ${kicked} |\n`;
  replyText += `|     **Stats Requested** | ${stats} |\n`;
  replyText += `|     **Server Uptime** | ${uptime} |\n\n`;

  // process public channel data
  const sortedPublicChannels = Object.keys(publicChanCounts)
    .map((channel) => ({ name: channel, count: publicChanCounts[channel] }))
    .sort((a, b) => b.count - a.count);

  // append public channels table
  replyText += '## Public Channels\n';
  replyText += '| Channel | Users |\n';
  replyText += '| :--- | --- |\n';

  sortedPublicChannels.forEach((channelObj) => {
    replyText += `| ?${channelObj.name} | ${channelObj.count} |\n`;
  });

  // dispatch info to client
  server.reply({
    cmd: 'info',
    users: uniqueClientCount,
    chans: uniqueChannels,
    joins,
    invites,
    messages,
    banned,
    kicked,
    stats,
    uptime,
    public: publicChanCounts,
    text: replyText,
    id: Info.Core.STATS_FULL,
    channel: payload.channel,
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.statsCheck.bind(this), 26);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /stats
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function statsCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  // intercept /stats command
  if (payload.text.startsWith('/stats')) {
    const currentChannel = payload.channel;

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'morestats',
        channel: currentChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} morestats/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'morestats',
  category: 'core',
  description: 'Sends back current server stats to the calling client',
  usage: `
    API: { cmd: 'morestats' }
    Text: /stats`,
};
