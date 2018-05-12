/*
  Description: Initial entry point, applies `channel` and `nick` to the calling socket
*/

const crypto = require('crypto');

const hash = (password) => {
  let sha = crypto.createHash('sha256');
  sha.update(password);
  return sha.digest('base64').substr(0, 6);
};

const verifyNickname = (nick) => {
  return /^[a-zA-Z0-9_]{1,24}$/.test(nick);
};

exports.run = async (core, server, socket, data) => {
  if (server._police.frisk(socket.remoteAddress, 3)) {
    server.reply({
      cmd: 'warn',
      text: 'You are joining channels too fast. Wait a moment and try again.'
    }, socket);

    return;
  }

  if (typeof socket.channel !== 'undefined') {
    // Calling socket already in a channel
    return;
  }

  if (typeof data.channel !== 'string' || typeof data.nick !== 'string') {
    return;
  }

  let channel = data.channel.trim();
  if (!channel) {
    // Must join a non-blank channel
    return;
  }

  // Process nickname
  let nick = data.nick;
  let nickArray = nick.split('#', 2);
  nick = nickArray[0].trim();

  if (!verifyNickname(nick)) {
    server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores'
    }, socket);

    return;
  }

  let userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === nick.toLowerCase()
  });

  if (userExists.length > 0) {
    // That nickname is already in that channel
    server.reply({
      cmd: 'warn',
      text: 'Nickname taken'
    }, socket);

    return;
  }

  // TODO: Should we check for mod status first to prevent overwriting of admin status somehow? Meh, w/e, cba.
  let uType = 'user';
  let trip = null;
  let password = nickArray[1];
  if (nick.toLowerCase() == core.config.adminName.toLowerCase()) {
    if (password != core.config.adminPass) {
      server._police.frisk(socket.remoteAddress, 4);

      server.reply({
        cmd: 'warn',
        text: 'Gtfo'
      }, socket);

      return;
    } else {
      uType = 'admin';
      trip = 'Admin';
    }
  } else if (password) {
    trip = hash(password + core.config.tripSalt);
  }

  // TODO: Disallow moderator impersonation
  for (let mod of core.config.mods) {
    if (trip === mod.trip) {
      uType = 'mod';
    }
  }

  // Reply with online user list
  let newPeerList = server.findSockets({ channel: data.channel });
  let joinAnnouncement = {
    cmd: 'onlineAdd',
    nick: nick,
    trip: trip || 'null',
    hash: server.getSocketHash(socket)
  };
  let nicks = [];

  for (let i = 0, l = newPeerList.length; i < l; i++) {
    server.reply(joinAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick);
  }

  socket.uType = uType;
  socket.nick = nick;
  socket.channel = channel;
  if (trip !== null) socket.trip = trip;
  nicks.push(socket.nick);

  server.reply({
    cmd: 'onlineSet',
    nicks: nicks
  }, socket);

  core.managers.stats.increment('users-joined');
};

exports.requiredData = ['channel', 'nick'];

exports.info = { name: 'join' };
