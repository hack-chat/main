/*
  Description: Forces a change on the target socket's channel, then broadcasts event
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
      text: 'Cannot kick other mods, how rude'
    }, socket);

    return;
  }

  let newChannel = Math.random().toString(36).substr(2, 8);
  badClient.channel = newChannel;

  console.log(`${socket.nick} [${socket.trip}] kicked ${targetNick} in ${socket.channel}`);

  // remove socket from same-channel client
  server.broadcast({
    cmd: 'onlineRemove',
    nick: targetNick
  }, { channel: socket.channel });

  // publicly broadcast event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${targetNick}`
  }, { channel: socket.channel });

  // inform mods with where they were sent
  server.broadcast({
    cmd: 'info',
    text: `${targetNick} was banished to ?${newChannel}`
  }, { channel: socket.channel, uType: 'mod' });

  core.managers.stats.increment('users-banned');
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'kick',
  usage: 'kick {nick}',
  description: 'Forces target client into another channel without announcing change'
};
