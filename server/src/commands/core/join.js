/*
  Description: Initial entry point, applies `channel` and `nick` to the calling socket
*/

import * as UAC from '../utility/UAC/_info';

// module support functions
const crypto = require('crypto');

const hash = (password) => {
  const sha = crypto.createHash('sha256');
  sha.update(password);
  return sha.digest('base64').substr(0, 6);
};

// exposed "login" function to allow hooks to verify user join events
// returns object containing user info or string if error
export function parseNickname(core, data) {
  const userInfo = {
    nick: data.nick,
    uType: 'user', /* @legacy */
    trip: null,
    level: UAC.levels.default,
  };

  if (!UAC.verifyNickname(userInfo.nick)) {
    // return error as string
    // @todo Remove english and change to numeric id
    return 'Nickname must consist of up to 24 letters, numbers, and underscores';
  }

  let password = data.pass || false;

  if (hash(password + core.config.tripSalt) === core.config.adminTrip) {
    userInfo.uType = 'admin'; /* @legacy */
    userInfo.trip = 'Admin';
    userInfo.level = UAC.levels.admin;
  } else if (userInfo.nick.toLowerCase() === core.config.adminName.toLowerCase()) {
    // they've got the main-admin name while not being an admin
    // @todo Remove english and change to numeric id
    return 'You are not the admin, liar!';
  } else if (password) {
    userInfo.trip = hash(password + core.config.tripSalt);
  }

  // TODO: disallow moderator impersonation
  // for (const mod of core.config.mods) {
  core.config.mods.forEach((mod) => {
    if (userInfo.trip === mod.trip) {
      userInfo.uType = 'mod'; /* @legacy */
      userInfo.level = UAC.levels.moderator;
    }
  });

  return userInfo;
}

// module main
export async function run(core, server, socket, data) {
  // check for spam
  if (server.police.frisk(socket.address, 3)) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'You are joining channels too fast. Wait a moment and try again.',
    }, socket);
  }

  // calling socket already in a channel
  // @todo Multichannel update
  if (typeof socket.channel !== 'undefined') {
    return server.reply({
      cmd: 'warn', // @todo Remove this
      text: 'Joining more than one channel is not currently supported',
    }, socket);
  }

  // check user input
  if (typeof data.channel !== 'string' || typeof data.nick !== 'string') {
    return true;
  }

  const channel = data.channel.trim();
  if (!channel) {
    // must join a non-blank channel
    return true;
  }

  const userInfo = this.parseNickname(core, data);
  if (typeof userInfo === 'string') {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: userInfo,
    }, socket);
  }

  // check if the nickname already exists in the channel
  const userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === userInfo.nick.toLowerCase(),
  });

  if (userExists.length > 0) {
    // that nickname is already in that channel
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'Nickname taken',
    }, socket);
  }

  // populate final userinfo fields
  // @TODO: this could be move into parseNickname, changing the function name to match
  userInfo.hash = server.getSocketHash(socket);
  userInfo.userid = socket.userid;

  // @TODO: place this within it's own function allowing import
  // prepare to notify channel peers
  const newPeerList = server.findSockets({ channel: data.channel });
  const nicks = []; /* @legacy */
  const users = [];

  const joinAnnouncement = {
    cmd: 'onlineAdd',
    nick: userInfo.nick,
    trip: userInfo.trip || 'null',
    utype: userInfo.uType, /* @legacy */
    hash: userInfo.hash,
    level: userInfo.level,
    userid: userInfo.userid,
    channel: data.channel,
  };

  // send join announcement and prep online set
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(joinAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick); /* @legacy */

    users.push({
      nick: newPeerList[i].nick,
      trip: newPeerList[i].trip,
      utype: newPeerList[i].uType, /* @legacy */
      hash: newPeerList[i].hash,
      level: newPeerList[i].level,
      userid: newPeerList[i].userid,
      channel: data.channel,
      isme: false,
    });
  }

  // store user info
  socket.uType = userInfo.uType; /* @legacy */
  socket.nick = userInfo.nick;
  socket.trip = userInfo.trip;
  socket.channel = data.channel; /* @legacy */
  socket.hash = userInfo.hash;
  socket.level = userInfo.level;

  nicks.push(socket.nick); /* @legacy */
  users.push({
    nick: socket.nick,
    trip: socket.trip,
    utype: socket.uType,
    hash: socket.hash,
    level: socket.level,
    userid: socket.userid,
    channel: data.channel,
    isme: true,
  });

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
  }, socket);

  // stats are fun
  core.stats.increment('users-joined');

  return true;
}

export const requiredData = ['channel', 'nick'];
export const info = {
  name: 'join',
  description: 'Place calling socket into target channel with target nick & broadcast event to channel',
  usage: `
    API: { cmd: 'join', nick: '<your nickname>', pass: '<optional password>', channel: '<target channel>' }`,
};
