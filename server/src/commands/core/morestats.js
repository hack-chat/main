/*
  Description: Outputs more info than the legacy stats command
*/

// module support functions
const { stripIndents } = require('common-tags');

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
    text: stripIndents`current-connections: ${uniqueClientCount}
                       current-channels: ${uniqueChannels}
                       users-joined: ${(core.stats.get('users-joined') || 0)}
                       invites-sent: ${(core.stats.get('invites-sent') || 0)}
                       messages-sent: ${(core.stats.get('messages-sent') || 0)}
                       users-banned: ${(core.stats.get('users-banned') || 0)}
                       users-kicked: ${(core.stats.get('users-kicked') || 0)}
                       stats-requested: ${(core.stats.get('stats-requested') || 0)}
                       server-uptime: ${formatTime(process.hrtime(core.stats.get('start-time')))}`,
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.statsCheck.bind(this), 26);
}

// hooks chat commands checking for /stats
export function statsCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/stats')) {
    this.run(core, server, socket, {
      cmd: 'morestats',
    });

    return false;
  }

  return payload;
}

export const info = {
  name: 'morestats',
  description: 'Sends back current server stats to the calling client',
  usage: `
    API: { cmd: 'morestats' }
    Text: /stats`,
};
