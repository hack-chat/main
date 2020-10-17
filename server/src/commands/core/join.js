/* eslint no-param-reassign: 0 */

/*
  Description: Adds requested channel into the calling clients "subscribed channels"
*/

// import * as UAC from '../utility/UAC/_info';
import {
  canJoinChannel,
} from '../utility/_Channels';
import {
  Errors,
} from '../utility/_Constants';
import {
  upgradeLegacyJoin,
  legacyLevelToLabel,
} from '../utility/_LegacyFunctions';
import {
  verifyNickname,
  getUserPerms,
} from '../utility/_UAC';

// module main
export async function run({
  core, server, socket, payload,
}) { // check for spam
  if (server.police.frisk(socket.address, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are joining channels too fast. Wait a moment and try again.',
      id: Errors.Join.RATELIMIT,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // `join` is the legacy entry point, check if it needs to be upgraded
  if (typeof socket.hcProtocol === 'undefined') {
    payload = upgradeLegacyJoin(server, socket, payload);
  }

  // store payload values
  const { channel, nick, pass } = payload;

  // check if a client is able to join target channel
  const mayJoin = canJoinChannel(channel, socket);
  if (mayJoin !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not join that channel.',
      id: mayJoin,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // calling socket already in a channel
  // @todo multichannel update, will remove
  if (typeof socket.channel !== 'undefined') {
    return server.reply({
      cmd: 'warn', // @todo Remove this
      text: 'Joining more than one channel is not currently supported',
      id: Errors.Join.ALREADY_JOINED,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }
  // end todo

  // validates the user input for `nick`
  if (verifyNickname(nick, socket) !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // get trip and level
  const { trip, level } = getUserPerms(pass, core.config, channel);
  // store the user values
  const userInfo = {
    nick,
    trip,
    uType: legacyLevelToLabel(level),
    hash: socket.hash,
    level,
    userid: socket.userid,
    channel,
  };

  // prevent admin impersonation
  if (nick.toLowerCase() === core.config.adminName.toLowerCase()) {
    if (userInfo.trip !== 'Admin') {
      userInfo.nick = `Fake${userInfo.nick}`;
    }
  }

  // check if the nickname already exists in the channel
  const userExists = server.findSockets({
    channel,
    nick: (targetNick) => targetNick.toLowerCase() === userInfo.nick.toLowerCase(),
  });

  if (userExists.length > 0) {
    // that nickname is already in that channel
    return server.reply({
      cmd: 'warn',
      text: 'Nickname taken',
      id: Errors.Join.NAME_TAKEN,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // prepare to notify channel peers
  const newPeerList = server.findSockets({ channel });
  const nicks = []; /* @legacy */
  const users = [];
  const joinAnnouncement = { ...{ cmd: 'onlineAdd' }, ...userInfo };

  // send join announcement and prep online set reply
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(joinAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick); /* @legacy */

    users.push({
      nick: newPeerList[i].nick,
      trip: newPeerList[i].trip,
      uType: newPeerList[i].uType, /* @legacy */
      hash: newPeerList[i].hash,
      level: newPeerList[i].level,
      userid: newPeerList[i].userid,
      channel,
      isme: false,
      isBot: newPeerList[i].isBot,
    });
  }

  // store user info
  socket.nick = userInfo.nick;
  socket.trip = userInfo.trip;
  socket.level = userInfo.level;
  socket.uType = userInfo.uType; /* @legacy */
  socket.channel = channel; /* @legacy */
  // @todo multi-channel patch
  // socket.channels.push(channel);

  nicks.push(userInfo.nick); /* @legacy */
  users.push({ ...{ isme: true, isBot: socket.isBot }, ...userInfo });

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
    channel, // @todo Multichannel (?)
  }, socket);

  // stats are fun
  core.stats.increment('users-joined');

  return true;
}

export const requiredData = []; // ['channel', 'nick'];
export const info = {
  name: 'join',
  description: 'Join the target channel using the supplied nick and password',
  usage: `
    API: { cmd: 'join', nick: '<your nickname>', pass: '<optional password>', channel: '<target channel>' }`,
};
