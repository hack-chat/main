/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Create or restore session
  * @version 1.0.0
  * @description Restore previous state by session or create new session
  * @module session
  */

import fs from 'fs';
import jsonwebtoken from 'jsonwebtoken';

import {
  verifyNickname,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';
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
  return jsonwebtoken.sign({
    channel: socket.channel,
    channels: socket.channels,
    color: socket.color,
    isBot: socket.isBot,
    level: socket.level,
    nick: socket.nick,
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
    cmd: 'error',
    id: Errors.Session.BAD_SESSION,
    text: 'Invalid session',
  }, socket);

  return false;
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  if (typeof payload.token === 'undefined') {
    return notifyFailure(server, socket);
  }

  let session = false;
  try {
    session = jsonwebtoken.verify(payload.token, core.sessionKey);
  } catch (err) {
    return notifyFailure(server, socket);
  }

  // validate session
  if (typeof session.channel !== 'string') {
    return notifyFailure(server, socket);
  }

  if (Array.isArray(session.channels) === false) {
    return notifyFailure(server, socket);
  }

  if (typeof session.color !== 'string' && typeof session.color !== 'boolean') {
    return notifyFailure(server, socket);
  }

  if (typeof session.isBot !== 'boolean') {
    return notifyFailure(server, socket);
  }

  if (typeof session.level !== 'number') {
    return notifyFailure(server, socket);
  }

  if (verifyNickname(session.nick) === false) {
    return notifyFailure(server, socket);
  }

  if (typeof session.trip !== 'string') {
    return notifyFailure(server, socket);
  }

  if (typeof session.userid !== 'number') {
    return notifyFailure(server, socket);
  }

  if (typeof session.uType !== 'string') {
    return notifyFailure(server, socket);
  }

  if (typeof session.muzzled !== 'boolean') {
    return notifyFailure(server, socket);
  }

  if (typeof session.banned !== 'boolean') {
    return notifyFailure(server, socket);
  }

  // populate socket info with validated session
  socket.channels = [];
  socket.color = session.color;
  socket.isBot = session.isBot;
  socket.level = session.level;
  socket.nick = session.nick;
  socket.trip = session.trip;
  socket.userid = session.userid;
  socket.uType = session.uType;
  socket.muzzled = session.muzzled;
  socket.banned = session.banned;

  socket.hash = server.getSocketHash(socket);
  socket.hcProtocol = 2;

  // dispatch info
  server.reply({
    cmd: 'session',
    restored: true,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  for (let i = 0, j = session.channels.length; i < j; i += 1) {
    restoreJoin({
      core,
      server,
      socket,
      channel: session.channels[i],
    }, true);
  }

  return true;
}

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core enviroment object
  * @public
  * @return {void}
  */
export function init(core) {
  // load the encryption key if required
  if (typeof core.sessionKey === 'undefined') {
    core.sessionKey = fs.readFileSync(SessionLocation);
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
