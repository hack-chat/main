/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Channel helper
  * @version 1.0.0
  * @description Functions to assist with channel manipulation
  * @module Channels
  */

import {
  Errors,
} from './_Constants.js';

/**
  * Checks if a client can join `channel`, returns numeric error code or true if
  * able to join
  * @public
  * @param {string} channel Target channel
  * @param {object} socket Target client to evaluate
  * @return {boolean||error id}
  */
export function canJoinChannel(channel, socket) {
  if (typeof channel !== 'string') return Errors.Channel.INVALID_NAME;
  if (channel === '') return Errors.Channel.INVALID_NAME;
  if (channel.length > 120) return Errors.Channel.INVALID_LENGTH;

  if (typeof socket.banned !== 'undefined' && socket.banned) return Errors.Channel.DEY_BANNED;

  return true;
}

/**
  * Returns an object containing info about the specified channel,
  * including if it is owned, mods, permissions
  * @public
  * @param {string} config Server config object
  * @param {string} channel Target channel
  * @return {object}
  */
export function getChannelSettings(config, channel) {
  if (typeof config.permissions !== 'undefined') {
    if (typeof config.permissions[channel] !== 'undefined') {
      return config.permissions[channel];
    }
  }

  return {
    owned: false,
  };
}

/**
  * Returns an object containing info about the specified channel,
  * including if it is owned, mods, permissions
  * @public
  * @param {MainServer} server Main server reference
  * @param {object} payload Object containing `userid` or `nick`
  * @param {number} limit Optional return limit
  * @return {array}
  */
export function findUsers(server, payload, limit = 0) {
  let targetClients;

  if (typeof payload.userid !== 'undefined') {
    targetClients = server.findSockets({
      channel: payload.channel,
      userid: payload.userid,
    });
  } else if (typeof payload.nick !== 'undefined') {
    targetClients = server.findSockets({
      channel: payload.channel,
      nick: payload.nick,
    });
  } else {
    return [];
  }

  if (limit !== 0 && targetClients.length > limit) {
    return targetClients.splice(0, limit);
  }

  return targetClients;
}

/**
  * Overload for `findUsers` when only 1 user is expected
  * @public
  * @param {MainServer} server Main server reference
  * @param {object} payload Object containing `userid` or `nick`
  * @param {number} limit Optional return limit
  * @return {boolean||object}
  */
export function findUser(server, payload) {
  return findUsers(server, payload, 1)[0] || false;
}

/**
  * Check if the target socket's userid is already in target channel
  * @param {MainServer} server Main server reference
  * @param {string} channel Target channel
  * @param {object} socket Target client to evaluate
  * @return {boolean||object}
  */
export function socketInChannel(server, channel, socket) {
  return findUser(server, {
    channel,
    userid: socket.userid,
  });
}
