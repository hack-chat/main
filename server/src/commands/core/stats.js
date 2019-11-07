/*
  Description: Legacy stats output, kept for compatibility, outputs user and channel count
*/

// module main
export async function run(core, server, socket) {
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
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');
}

export const info = {
  name: 'stats',
  description: 'Sends back legacy server stats to the calling client',
  usage: `
    API: { cmd: 'stats' }`,
};
