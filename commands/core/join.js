/* eslint no-param-reassign: 0 */
/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Join target channel
  * @version 1.0.0
  * @description Join the target channel using the supplied nick and password
  * @module join
  */

import {
  getSession,
} from './session.js';
import {
  canJoinChannel,
  socketInChannel,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  upgradeLegacyJoin,
  legacyLevelToLabel,
} from '../utility/_LegacyFunctions.js';
import {
  verifyNickname,
  getUserPerms,
  getUserDetails,
} from '../utility/_UAC.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // check for spam
  if (server.police.frisk(socket, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are joining channels too fast. Wait a moment and try again.',
      id: Errors.Join.RATELIMIT,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // `join` is the legacy entry point, check if it needs to be upgraded
  if (typeof socket.hcProtocol === 'undefined' || socket.hcProtocol === 1) {
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
  const { trip, level } = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);

  // store the user values
  const userInfo = {
    nick,
    trip,
    uType: legacyLevelToLabel(level),
    hash: socket.hash,
    level,
    userid: socket.userid,
    isBot: socket.isBot,
    color: socket.color,
    channel,
  };

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
      ...{
        channel,
        isme: false,
      },
      ...getUserDetails(newPeerList[i]),
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
  socket.channels = [channel];

  nicks.push(userInfo.nick); /* @legacy */
  users.push({ ...{ isme: true, isBot: socket.isBot }, ...userInfo });

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
    channel, // @todo Multichannel (?)
  }, socket);

  // update client with new session info
  server.reply({
    cmd: 'session',
    restored: false,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  // stats are fun
  core.stats.increment('users-joined');

  return true;
}

export function restoreJoin({
  server, socket, channel,
}) {
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

  // store the user values
  const userInfo = {
    nick: socket.nick,
    trip: socket.trip,
    uType: legacyLevelToLabel(socket.level),
    hash: socket.hash,
    level: socket.level,
    userid: socket.userid,
    isBot: socket.isBot,
    color: socket.color,
    channel,
  };

  // prepare to notify channel peers
  const newPeerList = server.findSockets({ channel });
  const nicks = []; /* @legacy */
  const users = [];
  const joinAnnouncement = { ...{ cmd: 'onlineAdd' }, ...userInfo };
  // build update notice with new privileges
  const updateAnnouncement = {
    ...getUserDetails(socket),
    ...{
      cmd: 'updateUser',
      online: true,
    },
  };

  const isDuplicate = socketInChannel(server, channel, socket);

  // send join announcement and prep online set reply
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    if (isDuplicate) {
      server.reply(updateAnnouncement, newPeerList[i]);
    } else {
      server.reply(joinAnnouncement, newPeerList[i]);
    }

    nicks.push(newPeerList[i].nick); /* @legacy */
    users.push({
      ...{
        channel,
        isme: false,
      },
      ...getUserDetails(newPeerList[i]),
    });
  }

  nicks.push(userInfo.nick); /* @legacy */
  users.push({ ...{ isme: true, isBot: socket.isBot }, ...userInfo });

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
    channel, // @todo Multichannel (?)
  }, socket);

  socket.channel = channel; /* @legacy */
  socket.channels.push(channel);

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} join/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'join',
  category: 'core',
  description: 'Join the target channel using the supplied nick and password',
  usage: `
    API: { cmd: 'join', nick: '<your nickname>', pass: '<optional password>', channel: '<target channel>' }`,
};
