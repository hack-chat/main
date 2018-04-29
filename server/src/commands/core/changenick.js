/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

'use strict';

const verifyNickname = (nick) => {
  return /^[a-zA-Z0-9_]{1,24}$/.test(nick);
};

exports.run = async (core, server, socket, data) => {
  if (server._police.frisk(socket.remoteAddress, 6)) {
    server.reply({
      cmd: 'warn',
      text: 'You are changing nicknames too fast. Wait a moment before trying again.'
    }, socket);

    return;
  }

  if (typeof data.nick !== 'string') {
    return;
  }

  let newNick = data.nick.trim();

  if (!verifyNickname(newNick)) {
    server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores'
    }, socket);

    return;
  }

  if (newNick.toLowerCase() == core.config.adminName.toLowerCase()) {
    server._police.frisk(socket.remoteAddress, 4);

    server.reply({
      cmd: 'warn',
      text: 'Gtfo'
    }, socket);

    return;
  }

  let userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === newNick.toLowerCase()
  });

  if (userExists.length > 0) {
    // That nickname is already in that channel
    server.reply({
      cmd: 'warn',
      text: 'Nickname taken'
    }, socket);

    return;
  }

  let peerList = server.findSockets({ channel: socket.channel });
  let leaveNotice = {
    cmd: 'onlineRemove',
    nick: socket.nick
  };
  let joinNotice = {
    cmd: 'onlineAdd',
    nick: newNick,
    trip: socket.trip || 'null',
    hash: server.getSocketHash(socket)
  };

  server.broadcast( leaveNotice, { channel: socket.channel });
  server.broadcast( joinNotice, { channel: socket.channel });
  server.broadcast( {
    cmd: 'info',
    text: `${socket.nick} is now ${newNick}`
  }, { channel: socket.channel });

  socket.nick = newNick;
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'changenick',
  usage: 'changenick {nick}',
  description: 'This will change your current connections nickname'
};
