/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Create or restore session
  * @version 1.1.0
  * @description Restore previous state by session or create new session
  * @module session
  */

import {
  readFileSync,
} from 'node:fs';
import jsonwebtoken from 'jsonwebtoken';
import {
  isModerator,
  verifyNickname,
  levels,
  getAppearance,
} from '../utility/_UAC.js';
import {
  restoreJoin,
} from './join.js';

const SessionLocation = './session.key';

/**
  * Get a new json web token for the provided socket
  * @param {*} socket
  * @param {*} core
  * @returns {object}
  */
export function getSession(socket, core) {
  // sign and return new token
  return jsonwebtoken.sign({
    channels: socket.channels || [],
    channelStates: socket.channelStates || {},
    color: socket.color || false,
    isBot: socket.isBot || false,
    level: socket.globalLevel,
    nick: socket.nick,
    flair: socket.flair,
    trip: socket.trip,
    userid: socket.userid,
    uType: socket.uType,
    muzzled: socket.muzzled || false,
    banned: socket.banned || false,
  }, core.sessionKey, {
    expiresIn: '7 days',
  });
}

/**
  * Reply to target socket with session failure notice
  * @param {*} server
  * @param {*} socket
  * @returns {boolean}
  */
function notifyFailure(server, socket) {
  server.reply({
    cmd: 'session',
    restored: false,
    token: '',
    channels: [],
  }, socket);

  return false;
}

/**
  * Re-validates the user's level against the current server config
  * @param {string} trip
  * @param {object} appConfig
  * @returns {number} Global Level (Admin/Mod/Default)
  */
function validateLevel(trip, appConfig) {
  if (!trip) return levels.default;

  // check admin
  if (trip === 'Admin' || trip === appConfig.adminTrip) {
    return levels.admin;
  }

  // check global mods
  if (Array.isArray(appConfig.globalMods)) {
    const isGlobalMod = appConfig.globalMods.some((mod) => mod.trip === trip);
    if (isGlobalMod) {
      return levels.moderator;
    }
  }

  return levels.default;
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // setup base socket parameters
  if (typeof socket.hcProtocol === 'undefined') socket.hcProtocol = 2;
  if (typeof socket.userid === 'undefined') socket.userid = Math.floor(Math.random() * 9999999999999);
  if (typeof socket.hash === 'undefined') socket.hash = server.getSocketHash(socket);

  // initialize state container
  socket.channelStates = {};

  // block known bad actors
  if (server.police.frisk(socket.address)) {
    return notifyFailure(server, socket);
  }

  // verify payload has token
  if (typeof payload.token === 'undefined') {
    return notifyFailure(server, socket);
  }

  let session = false;
  try {
    session = jsonwebtoken.verify(payload.token, core.sessionKey);
  } catch (err) {
    return notifyFailure(server, socket);
  }

  // validate session structure
  if (Array.isArray(session.channels) === false) return notifyFailure(server, socket);

  session.channels = [...new Set(session.channels)];

  if (typeof session.level !== 'number') {
    session.level = levels.default;
  }

  if (typeof session.color !== 'string' && typeof session.color !== 'boolean') {
    session.color = getAppearance(session.level).color;
  }

  // enforce strict typing on token properties
  if (typeof session.isBot !== 'boolean') return notifyFailure(server, socket);
  if (verifyNickname(session.nick) === false) return notifyFailure(server, socket);
  if (typeof session.trip !== 'string') return notifyFailure(server, socket);
  if (typeof session.userid !== 'number') return notifyFailure(server, socket);
  if (typeof session.uType !== 'string') return notifyFailure(server, socket);
  if (typeof session.muzzled !== 'boolean') return notifyFailure(server, socket);
  if (typeof session.banned !== 'boolean') return notifyFailure(server, socket);

  const realGlobalLevel = validateLevel(session.trip, core.appConfig.data);

  // demote spoofed moderators
  if (session.level >= levels.moderator) {
    if (realGlobalLevel < session.level) {
      session.level = realGlobalLevel;
      session.uType = 'user';
    }
  }

  // populate socket info with validated session
  socket.channels = [];
  socket.channelStates = session.channelStates || {};
  socket.color = session.color;
  socket.isBot = session.isBot;
  socket.nick = session.nick;
  socket.flair = session.flair;
  socket.trip = session.trip;
  socket.userid = session.userid;
  socket.uType = session.uType;
  socket.muzzled = session.muzzled;
  socket.banned = session.banned;
  socket.globalLevel = session.level;
  socket.level = socket.globalLevel;

  // global mod perks
  if (isModerator(socket)) {
    socket.ratelimitImmune = true;

    const record = server.police.search(socket.address);
    if (record) {
      record.score = 0;
    }
  }

  socket.hash = server.getSocketHash(socket);
  socket.hcProtocol = 2;

  // attempt to restore all channels in the session
  for (let i = 0, j = session.channels.length; i < j; i += 1) {
    restoreJoin({
      core,
      server,
      socket,
      channel: session.channels[i],
    });
  }

  // issue new token with updated state
  server.reply({
    cmd: 'session',
    restored: true,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export function init(core) {
  // load the encryption key if required
  if (typeof core.sessionKey === 'undefined') {
    core.sessionKey = readFileSync(SessionLocation);
  }
}

/**
  * Module meta information
  * @public
  * @typedef {Object} session/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'session',
  category: 'core',
  description: 'Restore previous state by session or create new session',
  usage: "API: { cmd: 'session', id: '<previous session>' }",
};
