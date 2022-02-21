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
    nick: '',
    uType: 'user', /* @legacy */
    trip: null,
    level: UAC.levels.default,
  };

  // seperate nick from password
  const nickArray = data.nick.split('#', 2);
  userInfo.nick = nickArray[0].trim();

  if (!UAC.verifyNickname(userInfo.nick)) {
    // return error as string
    return 'Nickname must consist of up to 24 letters, numbers, and underscores';
  }

  let password = undefined;
  // prioritize hash in nick for password over password field
  if (typeof nickArray[1] === 'string') {
    password = nickArray[1];
  } else if (typeof data.password === 'string') {
    password = data.password;
  }

  if (hash(password + core.config.tripSalt) === core.config.adminTrip) {
    userInfo.uType = 'admin'; /* @legacy */
    userInfo.trip = 'Admin';
    userInfo.level = UAC.levels.admin;
  } else if (userInfo.nick.toLowerCase() === core.config.adminName.toLowerCase()) {
    // they've got the main-admin name while not being an admin
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

function makeOnlineSet(newPeerList, socket) {
  const nicks = []; /* @legacy */
  const users = [];

  // send join announcement and prep online set
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    if (!nicks.includes(newPeerList[i].nick)) {
      nicks.push(newPeerList[i].nick); /* @legacy */

      users.push({
        nick: newPeerList[i].nick,
        trip: newPeerList[i].trip,
        utype: newPeerList[i].uType, /* @legacy */
        hash: newPeerList[i].hash,
        level: newPeerList[i].level,
        userid: newPeerList[i].userid,
        channel: socket.channel,
        isme: false,
      });
    }
  }

  if (!nicks.includes(socket.nick)) {
    // Add self to list
    nicks.push(socket.nick); /* @legacy */
    users.push({
      nick: socket.nick,
      trip: socket.trip,
      utype: socket.uType,
      hash: socket.hash,
      level: socket.level,
      userid: socket.userid,
      channel: socket.channel,
      isme: true,
    });
  }

  return {
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
  };
}

// module main
export async function run(core, server, socket, data) {
  // check for spam
  if (server.police.frisk(socket.address, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are joining channels too fast. Wait a moment and try again.',
    }, socket);
  }

  // calling socket already in a channel
  if (typeof socket.channel !== 'undefined') {
    return true;
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
      cmd: 'warn',
      text: userInfo,
    }, socket);
  }

  // check if the nickname already exists in the channel
  const userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === userInfo.nick.toLowerCase(),
  });

  if (userExists.length > 0) {
    // If the user already exists, then we should check if their trip is the same
    const targetUser = userExists[0];
    if (targetUser.trip && userInfo.trip && targetUser.trip === userInfo.trip) {
      // The user has the same name (from userExists) and the same trip
      // This means that we will silently let them send messages as the original

      // We store the `hash` field that is often used as the original hash
      //  this is to maintain compatibility with existing commands without too much issue
      //  since it would be breaking for various clients (mostly bots) to have multiple hashes
      //  per logged in user
      // but we keep the originalHash around so that it can be used for commands that act
      // on hashes rather than just transmitting them.
      socket.originalHash = server.getSocketHash(socket);
      socket.hash = targetUser.hash;

      // UserId is per join, so we simply copy the original userid since we haven't
      // *really* joined.
      socket.userid = targetUser.userid;

      // Copy remaining user info
      socket.uType = userInfo.uType;
      socket.nick = userInfo.nick;
      socket.trip = userInfo.trip;
      socket.channel = data.channel;
      socket.level = userInfo.level;

      // Display online users to them
      const newPeerList = server.findSockets({ channel: data.channel });
      server.reply(makeOnlineSet(newPeerList, socket), socket);

      return true;
    }

    // that nickname is already in that channel
    return server.reply({
      cmd: 'warn',
      text: 'Nickname taken',
    }, socket);
  }

  userInfo.hash = server.getSocketHash(socket);

  // assign "unique" socket ID
  if (typeof socket.userid === 'undefined') {
    userInfo.userid = Math.floor(Math.random() * 9999999999999);
  }

  const newPeerList = server.findSockets({ channel: data.channel });

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

  // send join announcement
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(joinAnnouncement, newPeerList[i]);
  }


  // store user info
  socket.uType = userInfo.uType; /* @legacy */
  socket.nick = userInfo.nick;
  socket.trip = userInfo.trip;
  socket.channel = data.channel; /* @legacy */
  socket.hash = userInfo.hash;
  socket.level = userInfo.level;
  socket.userid = userInfo.userid;

  // reply with channel peer list
  server.reply(makeOnlineSet(newPeerList, socket), socket);

  // stats are fun
  core.stats.increment('users-joined');

  return true;
}

export const requiredData = ['channel', 'nick'];
export const info = {
  name: 'join',
  description: 'Place calling socket into target channel with target nick & broadcast event to channel',
  usage: `
    API: { cmd: 'join', nick: '<your nickname>', password: '<optional password>', channel: '<target channel>' }`,
};
