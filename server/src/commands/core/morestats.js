/*
  Description: Outputs more info than the legacy stats command
*/

const name = 'morestats';

const stripIndents = require('common-tags').stripIndents;

const formatTime = (time) => {
  let seconds = time[0] + time[1] / 1e9;

  let minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  let hours = Math.floor(minutes / 60);
  minutes = minutes % 60;
  return `${hours.toFixed(0)}h ${minutes.toFixed(0)}m ${seconds.toFixed(0)}s`;
};

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
    text: stripIndents`current-connections: ${uniqueClientCount}
                       current-channels: ${uniqueChannels}
                       users-joined: ${(core.managers.stats.get('users-joined') || 0)}
                       invites-sent: ${(core.managers.stats.get('invites-sent') || 0)}
                       messages-sent: ${(core.managers.stats.get('messages-sent') || 0)}
                       users-banned: ${(core.managers.stats.get('users-banned') || 0)}
                       users-kicked: ${(core.managers.stats.get('users-kicked') || 0)}
                       stats-requested: ${(core.managers.stats.get('stats-requested') || 0)}
                       server-uptime: ${formatTime(process.hrtime(core.managers.stats.get('start-time')))}`
  }, socket);

  core.managers.stats.increment('stats-requested');
};

exports.info = {
  name,
  description: 'Sends back current server stats to the calling client'
};