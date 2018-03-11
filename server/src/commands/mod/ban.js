/*

*/

'use strict';

exports.run = async (core, server, socket, data) => {
  if (socket.uType == 'user') {
    // ignore if not mod or admin
    return;
  }

  if (typeof data.nick !== 'string') {
    return;
  }

  let targetNick = data.nick;
  let badClient = null;
  for (let client of server.clients) {
    // Find badClient's socket
    if (client.channel == socket.channel && client.nick == targetNick) {
      badClient = client;
      break;
    }
  }

  if (!badClient) {
    server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);

    return;
  }

  if (badClient.uType !== 'user') {
    server.reply({
      cmd: 'warn',
      text: 'Cannot ban other mods, how rude'
    }, socket);

    return;
  }

  // TODO: add reference to banned users nick or unban by nick cmd
  server._police.arrest(badClient.remoteAddress);
  // TODO: add event to log?

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  server.broadcast({
    cmd: 'info',
    text: `Banned ${targetNick}`
  }, { channel: socket.channel });
  badClient.close();

  core.managers.stats.increment('users-banned');
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'ban',
  usage: 'ban {nick}',
  description: 'Disconnects the target nickname in the same channel as calling socket & adds to ratelimiter'
};
