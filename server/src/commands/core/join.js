/*
  Description: Initial entry point, applies `channel` and `nick` to the calling socket
*/

// module support functions
const crypto = require('crypto');

const hash = (password) => {
  let sha = crypto.createHash('sha256');
  sha.update(password);
  return sha.digest('base64').substr(0, 6);
};

const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

// exposed "login" function to allow hooks to verify user join events
// returns object containing user info or string if error
exports.parseNickname = (core, data) => {
  let userInfo = {
    nick: '',
    uType: 'user',
    trip: null,
  };

  // seperate nick from password
  let nickArray = data.nick.split('#', 2);
  userInfo.nick = nickArray[0].trim();

  if (!verifyNickname(userInfo.nick)) {
    // return error as string
    return 'Nickname must consist of up to 24 letters, numbers, and underscores';
  }

  let password = nickArray[1];
  if (userInfo.nick.toLowerCase() == core.config.adminName.toLowerCase()) {
    if (password !== core.config.adminPass) {
      return 'You are not the admin, liar!';
    } else {
      userInfo.uType = 'admin';
      userInfo.trip = 'Admin';
    }
  } else if (password) {
    userInfo.trip = hash(password + core.config.tripSalt);
  }

  // TODO: disallow moderator impersonation
  for (let mod of core.config.mods) {
    if (userInfo.trip === mod.trip) {
      userInfo.uType = 'mod';
    }
  }

  return userInfo;
};

// module main
exports.run = async (core, server, socket, data) => {
  // check for spam
  if (server._police.frisk(socket.remoteAddress, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are joining channels too fast. Wait a moment and try again.'
    }, socket);
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

  let userInfo = this.parseNickname(core, data);
  if (typeof userInfo === 'string') {
    return server.reply({
      cmd: 'warn',
      text: userInfo
    }, socket);
  }

  // check if the nickname already exists in the channel
  let userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === userInfo.nick.toLowerCase()
  });

  if (userExists.length > 0) {
    // that nickname is already in that channel
    return server.reply({
      cmd: 'warn',
      text: 'Nickname taken'
    }, socket);
  }

  userInfo.userHash = server.getSocketHash(socket);

  // prepare to notify channel peers
  let newPeerList = server.findSockets({ channel: data.channel });
  let nicks = [];

  let joinAnnouncement = {
    cmd: 'onlineAdd',
    nick: userInfo.nick,
    trip: userInfo.trip || 'null',
    hash: userInfo.userHash
  };

  // send join announcement and prep online set
  for (let i = 0, l = newPeerList.length; i < l; i++) {
    server.reply(joinAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick);
  }

  // store user info
  socket.uType = userInfo.uType;
  socket.nick = userInfo.nick;
  socket.channel = data.channel;
  socket.hash = userInfo.userHash;
  if (userInfo.trip !== null) socket.trip = userInfo.trip;

  nicks.push(socket.nick);

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks: nicks
  }, socket);

  // stats are fun
  core.managers.stats.increment('users-joined');
};

// module meta
exports.requiredData = ['channel', 'nick'];
exports.info = {
  name: 'join',
  description: 'Place calling socket into target channel with target nick & broadcast event to channel',
  usage: `
    API: { cmd: 'join', nick: '<your nickname>', channel: '<target channel>' }`
};
