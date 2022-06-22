/* eslint no-param-reassign: 0 */

import {
  isAdmin,
  isModerator,
} from './_UAC';

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

  // `join` is the legacy entry point, so apply protocol version
  socket.hcProtocol = 1;

  // these would have been applied in the `session` module, apply it now
  socket.hash = server.getSocketHash(socket);
  socket.isBot = false;
  socket.color = false;

  // pull the password from the nick
  const nickArray = payload.nick.split('#', 2);
  newPayload.nick = nickArray[0].trim();
  if (nickArray[1] && typeof payload.pass === 'undefined') {
    newPayload.pass = nickArray[1]; // eslint-disable-line prefer-destructuring
  }

  // dunno how this happened on the legacy version
  if (typeof payload.password !== 'undefined') {
    newPayload.pass = payload.password;
  }

  // apply the missing `userid` prop
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
  if (isAdmin(level)) return 'admin';
  if (isModerator(level)) return 'mod';

  return 'user';
}

/**
  * Alter the outgoing payload to an `info` cmd and add/change missing props
  * @param {object} payload Original payload
  * @param {string} nick Sender nick
  * @return {object}
  */
export function legacyInviteOut(payload, nick) {
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'invite',
      from: nick,
      text: `${nick} invited you to ?${payload.inviteChannel}`,
      channel: payload.channel, // @todo Multichannel
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
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'invite',
      from: '',
      text: `You invited ${nick} to ?${payload.inviteChannel}`,
      channel: payload.channel, // @todo Multichannel
    },
  };
}

/**
  * Alter the outgoing payload to a `whisper` cmd and add/change missing props
  * @param {object} payload Original payload
  * @param {string} nick Sender nick
  * @return {object}
  */
export function legacyWhisperOut(payload, from) {
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'whisper',
      from: from.nick,
      trip: from.trip || 'null',
      text: `${from.nick} whispered: ${payload.text}`,
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
  return {
    ...payload,
    ...{
      cmd: 'info',
      type: 'whisper',
      text: `You whispered to @${nick}: ${payload.text}`,
    },
  };
}
