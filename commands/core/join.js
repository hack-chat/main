/* eslint no-param-reassign: 0 */
/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Join target channel
  * @version 1.1.0
  * @description Join the target channel using the supplied nick and password
  * @module join
  */

import {
  getSession,
} from './session.js';
import {
  canJoinChannel,
  socketInChannel,
  getChannelSettings,
} from '../utility/_Channels.js';
import {
  Errors,
  Info,
  SystemMOTDs,
} from '../utility/_Constants.js';
import {
  upgradeLegacyJoin,
} from '../utility/_LegacyFunctions.js';
import {
  verifyColor,
} from '../utility/_Text.js';
import {
  verifyNickname,
  getUserPerms,
  getUserDetails,
  isModerator,
  levels,
  getAppearance,
} from '../utility/_UAC.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core,
  server,
  socket,
  payload,
}) {
  // check for spam
  if (server.police.frisk(socket, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: false,
    }, socket);
  }

  // `join` is the legacy entry point, check if it needs to be upgraded
  if (typeof socket.hcProtocol === 'undefined' || socket.hcProtocol === 1) {
    payload = upgradeLegacyJoin(server, socket, payload);
  }

  // legacy can't multichannel, lmao
  if (socket.hcProtocol === 1 && socket.channels && socket.channels.length > 1) {
    return server.reply({
      cmd: 'warn',
      text: 'Legacy clients may not join multiple channels',
      id: Errors.Join.LEGACY_RESTRICT,
      channel: false,
    }, socket);
  }

  const {
    channel, nick, pass, color,
  } = payload;

  // check if client is already in the target channel
  if (socket.channels && socket.channels.includes(channel)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are already in that channel',
      id: Errors.Join.ALREADY_JOINED,
      channel: false,
    }, socket);
  }

  // check if a client is able to join target channel
  const mayJoin = canJoinChannel(channel, socket);
  if (mayJoin !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not join that channel',
      id: mayJoin,
      channel: false,
    }, socket);
  }

  // validates the user input for `nick`
  if (verifyNickname(nick, socket) !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'Username must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: false,
    }, socket);
  }

  const isFirstJoin = (!socket.channels || socket.channels.length === 0);

  // initialize session nick and effect on first join
  if (!socket.nick || isFirstJoin) {
    socket.nick = nick;
    socket.effect = 0;
    if (!socket.uType) socket.uType = 'user'; /* legacy */
  }

  let trip;
  let level;

  if (!isFirstJoin) {
    trip = socket.trip;

    const channelSettings = getChannelSettings(core.appConfig.data, channel);
    level = levels.default;

    // determine channel-specific rank
    if (socket.globalLevel && socket.globalLevel >= levels.moderator) {
      level = socket.globalLevel;
    } else if (channelSettings.owned) {
      if (channelSettings.ownerTrip === trip) {
        level = levels.channelOwner;
      } else if (channelSettings.tripLevels && channelSettings.tripLevels[trip]) {
        level = channelSettings.tripLevels[trip];
      }
    }
  } else {
    // authenticate on first join
    const perms = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);
    trip = perms.trip;
    level = perms.level;

    if (level >= levels.moderator) {
      socket.globalLevel = level;
    }
  }

  // evaluate blockchain permissions
  if (
    trip
    && level < levels.channelModerator
    && core.chainCache?.channels?.[channel]?.data?.moderatorTrips
  ) {
    const tripBuffer = Buffer.from(trip);
    const isWeb3Mod = core.chainCache.channels[channel].data.moderatorTrips.some(
      (modTripBytes) => Buffer.from(modTripBytes).equals(tripBuffer),
    );

    if (isWeb3Mod) {
      level = levels.channelModerator;
    }
  }

  const channelSettings = getChannelSettings(core.appConfig.data, channel);

  // enforce channel locks
  if (level < channelSettings.lockLevel) {
    return server.reply({
      cmd: 'warn',
      text: 'You have been locked out',
      id: Errors.Join.CHANNEL_LOCKED,
      channel: false,
    }, socket);
  }

  if (!socket.channelStates) {
    socket.channelStates = {};
  }

  // check for naming collisions
  const userExists = server.findSockets((remoteSocket) => remoteSocket !== socket
    && Array.isArray(remoteSocket.channels)
    && remoteSocket.channels.includes(channel)
    && typeof remoteSocket.nick === 'string'
    && remoteSocket.nick.toLowerCase() === socket.nick.toLowerCase());

  if (userExists.length > 0) {
    return server.reply({
      cmd: 'warn',
      text: `Nickname taken in channel: ?${channel}`,
      id: Errors.Join.NAME_TAKEN,
      args: { channel },
      channel: false,
    }, socket);
  }

  let finalColor;

  // sanitize color parameter
  if (typeof color === 'string') {
    const parsedColor = color.trim().toUpperCase().replace(/#/g, '');
    if (verifyColor(parsedColor)) {
      finalColor = parsedColor;
    }
  }

  if (!finalColor && socket.channelStates[channel] && socket.channelStates[channel].color) {
    finalColor = socket.channelStates[channel].color;
  }

  if (!finalColor && socket.color) {
    finalColor = socket.color;
  }

  // fallback to rank default color
  if (!finalColor) {
    finalColor = getAppearance(level).color;
  }

  if (isFirstJoin || !socket.color) {
    socket.color = finalColor;
  }

  socket.channelStates[channel] = {
    level,
    trip,
    color: finalColor,
  };

  /* legacy */
  if (!socket.level) {
    socket.level = level;
  }

  socket.trip = trip;

  // prepare to notify channel peers
  const newPeerList = server.findSockets({
    channels: (channels) => Array.isArray(channels) && channels.includes(channel),
  });

  const userInfo = getUserDetails(socket, channel);
  const nicks = []; /* @legacy */
  const users = [];
  const joinAnnouncement = { ...{ cmd: 'onlineAdd' }, ...userInfo, channel };

  // send join announcement and prep online set reply
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(joinAnnouncement, newPeerList[i]);

    nicks.push(newPeerList[i].nick); /* @legacy */
    users.push({
      ...{
        channel,
        isme: false,
      },
      ...getUserDetails(newPeerList[i], channel),
    });
  }

  // store user info
  socket.uType = userInfo.uType; /* @legacy */

  if (!socket.channels) socket.channels = [];
  if (!socket.channels.includes(channel)) socket.channels.push(channel);

  // global mod perks
  if (isModerator(socket.level)) {
    socket.ratelimitImmune = true;

    const record = server.police.search(socket.address);
    if (record) {
      record.score = 0;
    }
  }

  nicks.push(userInfo.nick); /* @legacy */
  users.push({ ...{ isme: true, isBot: socket.isBot || false }, ...userInfo });

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
    channel,
  }, socket);

  let { motd } = channelSettings;
  if (motd === '') {
    motd = SystemMOTDs[Math.floor(Math.random() * SystemMOTDs.length)];
  }

  // serve channel motd
  server.reply({
    cmd: 'info',
    text: motd,
    id: Info.Core.MOTD,
    channel,
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
  core, server, socket, channel,
}) {
  // check if a client is able to join target channel
  const mayJoin = canJoinChannel(channel, socket);
  if (mayJoin !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not join that channel',
      id: mayJoin,
      channel: false,
    }, socket);
  }

  let level = socket.globalLevel || levels.default;
  const channelSettings = getChannelSettings(core.appConfig.data, channel);

  // determine channel-specific rank
  if (socket.trip && level < levels.moderator) {
    if (channelSettings.owned && channelSettings.ownerTrip === socket.trip) {
      level = levels.channelOwner;
    } else if (channelSettings.tripLevels && channelSettings.tripLevels[socket.trip]) {
      level = channelSettings.tripLevels[socket.trip];
    }
  }

  // evaluate blockchain permissions
  if (
    socket.trip
    && level < levels.channelModerator
    && core.chainCache?.channels?.[channel]?.data?.moderatorTrips
  ) {
    const tripBuffer = Buffer.from(socket.trip);
    const isWeb3Mod = core.chainCache.channels[channel].data.moderatorTrips.some(
      (modTripBytes) => Buffer.from(modTripBytes).equals(tripBuffer),
    );
    if (isWeb3Mod) {
      level = levels.channelModerator;
    }
  }

  // enforce locks
  if (core.locked && core.locked[channel] && level < core.locked[channel]) {
    server.reply({
      cmd: 'warn',
      text: `Could not auto-rejoin ?${channel}. The channel is currently locked`,
      id: Errors.LockRoom.NO_REJOIN,
      args: { channel },
      channel: false,
    }, socket);
    return false;
  }

  // halt auto-rejoin if a channel now requires elevated clearance
  if (level < levels.channelTrusted) {
    if (core.passwords && core.passwords[channel]) {
      server.reply({
        cmd: 'warn',
        text: `Could not auto-rejoin ?${channel}. The channel is now password protected`,
        id: Errors.Password.NO_AUTO_JOIN,
        args: { channel },
        channel: false,
      }, socket);
      return false;
    }

    if (core.captchas && core.captchas[channel]) {
      server.reply({
        cmd: 'warn',
        text: `Could not auto-rejoin ?${channel}. The channel requires captcha verification`,
        id: Errors.Captcha.NO_REJOIN,
        args: { channel },
        channel: false,
      }, socket);
      return false;
    }
  }

  if (!socket.channelStates) {
    socket.channelStates = {};
  }

  // check for naming collisions
  const userExists = server.findSockets((remoteSocket) => remoteSocket !== socket
    && remoteSocket.userid !== socket.userid
    && Array.isArray(remoteSocket.channels)
    && remoteSocket.channels.includes(channel)
    && typeof remoteSocket.nick === 'string'
    && remoteSocket.nick.toLowerCase() === socket.nick.toLowerCase());

  if (userExists.length > 0) {
    server.reply({
      cmd: 'warn',
      text: `Could not auto-rejoin ?${channel}. Nickname taken.`,
      id: Errors.Join.NAME_TAKEN,
      args: { channel },
      channel: false,
    }, socket);
    return false;
  }

  let finalColor;

  if (socket.channelStates[channel] && socket.channelStates[channel].color) {
    finalColor = socket.channelStates[channel].color;
  } else if (socket.color) {
    finalColor = socket.color;
  } else {
    finalColor = getAppearance(level).color;
  }

  if (!socket.color) {
    socket.color = finalColor;
  }

  socket.channelStates[channel] = {
    ...(socket.channelStates[channel] || {}),
    level,
    trip: socket.trip,
    color: finalColor,
  };

  const userInfo = getUserDetails(socket, channel);

  // prepare to notify channel peers
  const newPeerList = server.findSockets({
    channels: (channels) => Array.isArray(channels) && channels.includes(channel),
  });

  const nicks = []; /* @legacy */
  const users = [];
  const joinAnnouncement = { ...{ cmd: 'onlineAdd' }, ...userInfo, channel };
  const updateAnnouncement = {
    ...userInfo,
    ...{
      cmd: 'updateUser',
      online: true,
      channel,
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
      ...getUserDetails(newPeerList[i], channel),
    });
  }

  nicks.push(userInfo.nick); /* @legacy */
  users.push({ ...{ isme: true, isBot: socket.isBot || false }, ...userInfo });

  // reply with channel peer list
  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
    channel,
  }, socket);

  if (!socket.channels) socket.channels = [];
  if (!socket.channels.includes(channel)) socket.channels.push(channel);

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
    API: { cmd: 'join', nick: '<your nickname>', pass: '<optional password>', channel: '<target channel>', color: '<optional hex>' }`,
};
