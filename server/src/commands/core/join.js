/*
  Description: Initial entry point, applies `channel` and `nick` to the calling socket
*/

const crypto = require('crypto');

const hash = (password) => {
  let sha = crypto.createHash('sha256');
  sha.update(password);
  return sha.digest('base64').substr(0, 6);
};

const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

exports.run = async (core, server, socket, data) => {
  // check for spam
  if (server._police.frisk(socket.remoteAddress, 3)) {
    server.reply({
      cmd: 'warn',
      text: 'You are joining channels too fast. Wait a moment and try again.'
    }, socket);

    return;
  }

  // calling socket already in a channel
  if (typeof socket.channel !== 'undefined') {
    return;
  }

  // check user input
  if (typeof data.channel !== 'string' || typeof data.nick !== 'string') {
    return;
  }

  let channel = data.channel.trim();
  if (!channel) {
    // must join a non-blank channel
    return;
  }

  // process nickname
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

  // check if the nickname already exists in the channel
  let userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === nick.toLowerCase()
  });

  if (userExists.length > 0) {
    // that nickname is already in that channel
    server.reply({
      cmd: 'warn',
      text: 'Nickname taken'
    }, socket);

    return;
  }

  // TODO: should we check for mod status first to prevent overwriting of admin status somehow? Meh, w/e, cba.
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

  // TODO: disallow moderator impersonation
  for (let mod of core.config.mods) {
    if (trip === mod.trip) {
      uType = 'mod';
    }
  }

  // prepare to notify channel peers
  let newPeerList = server.findSockets({ channel: data.channel });
  let userHash = server.getSocketHash(socket);
  let nicks = [];

  let joinAnnouncement = {
    cmd: 'onlineAdd',
    nick: nick,
    trip: trip || 'null',
    hash: userHash
  };

  // send join announcement and prep online set
  for (let i = 0, l = newPeerList.length; i < l; i++) {
    server.reply(joinAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick);
  }

  // store user info
  socket.uType = uType;
  socket.nick = nick;
  socket.channel = channel;
  socket.hash = userHash;
  if (trip !== null) socket.trip = trip;

  nicks.push(socket.nick);

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks: nicks
  }, socket);

  // stats are fun
  core.managers.stats.increment('users-joined');
};

exports.requiredData = ['channel', 'nick'];

exports.info = {
  name: 'join',
  usage: 'join {channel} {nick}',
  description: 'Place calling socket into target channel with target nick & broadcast event to channel'
};
