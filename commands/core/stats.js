/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Simple stats
  * @version 1.0.0
  * @description Sends back legacy server stats to the calling client
  * @module stats
  */

import {
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
  // initialize tracking objects
  let ips = {};
  let channels = {};

  // gather connection and channel count
  server.clients.forEach((client) => {
    ips[client.address] = true;

    if (client.channels && Array.isArray(client.channels)) {
      client.channels.forEach((channelName) => {
        channels[channelName] = true;
      });
    }
  });

  // calculate totals
  const uniqueClientCount = Object.keys(ips).length;
  const uniqueChannels = Object.keys(channels).length;

  // free memory
  ips = null;
  channels = null;

  // dispatch info to client
  server.reply({
    cmd: 'info',
    text: `${uniqueClientCount} unique IPs in ${uniqueChannels} channels`,
    id: Info.Core.STATS_BASIC,
    args: {
      uniqueClientCount,
      uniqueChannels,
    },
    channel: payload.channel,
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} stats/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'stats',
  category: 'core',
  description: 'Sends back legacy server stats to the calling client',
  usage: `
    API: { cmd: 'stats' }`,
};
