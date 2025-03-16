/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Get stats
  * @version 1.0.0
  * @description Sends back current server stats to the calling client
  * @module morestats
  */

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
export async function run({ core, server, socket }) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 1);
  }

  // gather connection and channel count
  const ips = {};
  const channels = {};
  // @todo use public channel flag
  const publicChanCounts = {
    lounge: 0,
    meta: 0,
    math: 0,
    physics: 0,
    chemistry: 0,
    technology: 0,
    programming: 0,
    games: 0,
    banana: 0,
    chinese: 0,
  };

  // @todo code resuage between here and `session`; should share exported function
  server.clients.forEach((client) => {
    if (client.channel) {
      channels[client.channel] = true;
      ips[client.address] = true;
      if (typeof publicChanCounts[client.channel] !== 'undefined') {
        publicChanCounts[client.channel] += 1;
      }
    }
  });

  const uniqueClientCount = Object.keys(ips).length;
  const uniqueChannels = Object.keys(channels).length;
  const joins = core.stats.get('users-joined') || 0;
  const invites = core.stats.get('invites-sent') || 0;
  const messages = core.stats.get('messages-sent') || 0;
  const banned = core.stats.get('users-banned') || 0;
  const kicked = core.stats.get('users-kicked') || 0;
  const stats = core.stats.get('stats-requested') || 0;
  const uptime = formatTime(process.hrtime(core.stats.get('start-time')));

  // dispatch info
  server.reply({
    cmd: 'info', // @todo Add numeric info code as `id`
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
    text: `current-connections: ${uniqueClientCount}
current-channels: ${uniqueChannels}
users-joined: ${joins}
invites-sent: ${invites}
messages-sent: ${messages}
users-banned: ${banned}
users-kicked: ${kicked}
stats-requested: ${stats}
server-uptime: ${uptime}`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // stats are fun
  core.stats.increment('stats-requested');

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
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

  if (payload.text.startsWith('/stats')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'morestats',
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
