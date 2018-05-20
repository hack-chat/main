/*
  Description: Legacy stats output, kept for compatibility, outputs user and channel count
*/

const name = 'stats';

exports.run = async (core, server, socket, data) => {
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

  server.reply({
    cmd: 'info',
    name,
    text: `${uniqueClientCount} unique IPs in ${uniqueChannels} channels`
  }, socket);

  core.managers.stats.increment('stats-requested');
};

exports.info = {
  name,
  description: 'Sends back legacy server stats to the calling client'
};