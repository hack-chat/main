/*
  Description: Legacy stats output, kept for compatibility, outputs user and channel count
*/

// module main
exports.run = async (core, server, socket, data) => {
  // gather connection and channel count
  let ips = {};
  let channels = {};
  for (let client of server.clients) {
    if (client.channel) {
      channels[client.channel] = true;
      ips[client.remoteAddress] = true;
    }
  }

  let uniqueClientCount = Object.keys(ips).length;
  let uniqueChannels = Object.keys(channels).length;

  ips = null;
  channels = null;

  // dispatch info
  server.reply({
    cmd: 'info',
    text: `${uniqueClientCount} unique IPs in ${uniqueChannels} channels`
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');
};

// module meta
exports.info = {
  name: 'stats',
  description: 'Sends back legacy server stats to the calling client',
  usage: `
    API: { cmd: 'stats' }`
};
