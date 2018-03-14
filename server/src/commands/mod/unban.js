/*
  Description: Removes a target ip from the ratelimiter
*/

'use strict';

exports.run = async (core, server, socket, data) => {
  if (socket.uType == 'user') {
    // ignore if not mod or admin
    return;
  }

  if (typeof data.ip !== 'string') {
    return;
  }

  let ip = data.ip;
  let hash = data.hash; // TODO unban by hash

  // TODO unban by hash
  let recordFound = server._police.pardon(data.ip);

  if (!recordFound) {
    server.reply({
      cmd: 'warn',
      text: 'Could not find target in records'
    }, socket);

    return;
  }

  console.log(`${socket.nick} [${socket.trip}] unbanned ${/*hash || */ip} in ${socket.channel}`);

  server.reply({
    cmd: 'info',
    text: `${socket.nick} unbanned a userhash: ${server.getSocketHash(ip)}`
  }, socket);

  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} unbanned a userhash: ${server.getSocketHash(ip)}`
  }, { uType: 'mod' });

  core.managers.stats.decrement('users-banned');
};

exports.requiredData = ['ip'];

exports.info = {
  name: 'unban',
  usage: 'unban {ip}',
  description: 'Removes target ip from the ratelimiter'
};
