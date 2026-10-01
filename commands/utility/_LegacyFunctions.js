/* eslint no-param-reassign: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Support functions for old clients
  * @version 1.0.0
  * @description Functions to bridge the older v1 clients with the latest protocol
  * @module LegacyFunctions
  */

import {
  levels,
} from './_UAC.js';

/**
  * Marks the socket as using the legacy protocol and
  * applies the missing `pass` property to the payload
  * @param {MainServer} server Main server reference
  * @param {WebSocket} socket Target client socket
  * @param {object} payload The original `join` payload
  * @returns {object}
  */
export function upgradeLegacyJoin(server, socket, payload) {
  const newPayload = payload;

  // fallback for missing nickname
  if (typeof payload.nick === 'undefined' || !payload.nick) {
    payload.nick = `scarmiglione_${Math.floor(Math.random() * 99999)}`;
  }

  // set legacy protocol flag
  if (typeof socket.hcProtocol === 'undefined') {
    socket.hcProtocol = 1;
  }

  // apply properties normally set by session module
  if (typeof socket.hash === 'undefined') socket.hash = server.getSocketHash(socket);
  if (typeof socket.isBot === 'undefined') socket.isBot = false;
  if (typeof socket.color === 'undefined') socket.color = false;

  // extract password from nick
  const nickArray = payload.nick.split('#', 2);
  newPayload.nick = nickArray[0].trim();
  if (nickArray[1] && typeof payload.pass === 'undefined') {
    newPayload.pass = nickArray[1]; // eslint-disable-line prefer-destructuring
  }

  // map legacy password field
  if (typeof payload.password !== 'undefined') {
    newPayload.pass = payload.password;
  }

  // assign missing userid
  if (typeof socket.userid === 'undefined') {
    socket.userid = Math.floor(Math.random() * 9999999999999);
  }

  return newPayload;
}

/**
  * Return the correct `uType` label for the specific level
  * @param {number} level Numeric level to find the label for
  */
export function legacyLevelToLabel(level) {
  // map numeric level to legacy label
  if (level >= levels.admin) return 'admin';
  if (level >= levels.moderator) return 'mod';

  return 'user';
}

/**
  * Alter the outgoing payload to an `info` cmd and add/change missing props
  * @param {object} payload Original payload
  * @param {string} nick Sender nick
  * @return {object}
  */
export function legacyInviteOut(payload, nick) {
  // wrap invite out in info payload
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'invite',
      from: nick,
      text: `${nick} invited you to ?${payload.inviteChannel}`,
      channel: payload.channel,
    },
  };
}

/**
  * Alter the outgoing payload to an `info` cmd and add/change missing props
  * @param {object} payload Original payload
  * @param {string} nick Receiver nick
  * @return {object}
  */
export function legacyInviteReply(payload, nick) {
  // wrap invite reply in info payload
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'invite',
      from: '',
      text: `You invited ${nick} to ?${payload.inviteChannel}`,
      channel: payload.channel,
    },
  };
}

/**
  * Alter the outgoing payload to a `whisper` cmd and add/change missing props
  * @param {object} payload Original payload
  * @param {string} from Sender socket object
  * @return {object}
  */
export function legacyWhisperOut(payload, from) {
  // format outbound whisper for legacy clients
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'whisper',
      from: from.nick,
      trip: from.trip || 'null',
      text: `${from.nick} whispered: ${payload.text}`,
      channel: payload.channel,
    },
  };
}

/**
  * Alter the outgoing payload to a `whisper` cmd and add/change missing props
  * @param {object} payload Original payload
  * @param {string} nick Receiver nick
  * @return {object}
  */
export function legacyWhisperReply(payload, nick) {
  // format whisper reply for legacy clients
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'whisper',
      text: `You whispered to @${nick}: ${payload.text}`,
      channel: payload.channel,
    },
  };
}
