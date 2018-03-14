/*
  Description: Adds the target socket's ip to the ratelimiter
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
  let badClient = server.findSockets({ channel: socket.channel, nick: targetNick });

  if (badClient.length === 0) {
    server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);

    return;
  }

  badClient = badClient[0];

  if (badClient.uType !== 'user') {
    server.reply({
      cmd: 'warn',
      text: 'Cannot ban other mods, how rude'
    }, socket);

    return;
  }

  // TODO unban by hash
  server._police.arrest(badClient.remoteAddress);

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  server.broadcast({
    cmd: 'info',
    text: `Banned ${targetNick}`
  }, { channel: socket.channel, uType: 'user' });

  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} banned ${targetNick} in ${socket.channel}, userhash: ${server.getSocketHash(badClient)}`
  }, { uType: 'mod' });

  badClient.close();

  core.managers.stats.increment('users-banned');
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'ban',
  usage: 'ban {nick}',
  description: 'Disconnects the target nickname in the same channel as calling socket & adds to ratelimiter'
};
