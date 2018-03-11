/*

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
  let nick = data.nick; // for future upgrade

  // TODO: support remove by nick future upgrade
  server._police.pardon(badClient.remoteAddress);
  console.log(`${socket.nick} [${socket.trip}] unbanned ${/*nick || */ip} in ${socket.channel}`);

  server.reply({
    cmd: 'info',
    text: `Unbanned ${/*nick || */ip}`
  }, socket);

  core.managers.stats.decrement('users-banned');
};

exports.requiredData = ['ip'];

exports.info = {
  name: 'unban',
  usage: 'unban {ip}',
  description: 'Removes target ip from the ratelimiter'
};
