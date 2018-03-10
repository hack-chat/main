/*

*/

'use strict';

const crypto = require('crypto');

function hash(password) {
  var sha = crypto.createHash('sha256');
  sha.update(password);
  return sha.digest('base64').substr(0, 6);
}

function verifyNickname(nick) {
  return /^[a-zA-Z0-9_]{1,24}$/.test(nick);
}

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
    // TODO: allow changing of channel without reconnection
    return;
  }

  let channel = String(data.channel).trim();
  if (!channel) {
    // Must join a non-blank channel
    return;
  }

  // Process nickname
  let nick = String(data.nick);
  let nickArray = nick.split('#', 2);
  nick = nickArray[0].trim();

  if (!verifyNickname(nick)) {
    server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores'
    }, socket);

    return
  }

  for (let client of server.clients) {
    if (client.channel === channel) {
      if (client.nick.toLowerCase() === nick.toLowerCase()) {
        server.reply({
          cmd: 'warn',
          text: 'Nickname taken'
        }, socket);

        return;
      }
    }
  }

  // TODO: Should we check for mod status first to prevent overwriting of admin status somehow? Meh, w/e, cba.
  let uType = 'user';
  let trip = null;
  let password = nickArray[1];
  if (nick.toLowerCase() == core.config.adminName.toLowerCase()) {
    if (password != core.config.adminPass) {
      server.reply({
        cmd: 'warn',
        text: 'Gtfo'
      }, socket);

      return;
    } else {
      uType = 'admin';
      trip = hash(password + core.config.tripSalt);
    }
  } else if (password) {
    trip = hash(password + core.config.tripSalt);
  }

  // TODO: Disallow moderator impersonation
  for (let mod of core.config.mods) {
    if (trip === mod.trip)
      uType = 'mod';
  }

  // Announce the new user
  server.broadcast({
    cmd: 'onlineAdd',
    nick: nick,
    trip: trip || 'null'
  }, { channel: channel });

  socket.uType = uType;
  socket.nick = nick;
  socket.channel = channel;
  if (trip !== null) socket.trip = trip;

  // Reply with online user list
  let nicks = [];
  for (let client of server.clients) {
    if (client.channel === channel) {
      nicks.push(client.nick);
    }
  }

  server.reply({
    cmd: 'onlineSet',
    nicks: nicks
  }, socket);

  core.managers.stats.increment('users-joined');
};

exports.requiredData = ['channel', 'nick'];

exports.info = {
  name: 'join',
  usage: 'join {channel} {nick}',
  description: 'Place calling socket into target channel with target nick & broadcast event to channel'
};
