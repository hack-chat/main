/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Simple stats
  * @version 1.0.0
  * @description Sends back legacy server stats to the calling client
  * @module stats
  */

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ core, server, socket }) {
  // gather connection and channel count
  let ips = {};
  let channels = {};
  // for (const client of server.clients) {
  server.clients.forEach((client) => {
    if (client.channel) {
      channels[client.channel] = true;
      ips[client.address] = true;
    }
  });

  const uniqueClientCount = Object.keys(ips).length;
  const uniqueChannels = Object.keys(channels).length;

  ips = null;
  channels = null;

  // dispatch info
  server.reply({
    cmd: 'info',
    text: `${uniqueClientCount} unique IPs in ${uniqueChannels} channels`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');
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
