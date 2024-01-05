/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * User Account Control information containing level constants
  * and simple helper functions related to users
  * @property {Object} levels - Defines labels for default permission ranges
  * @author MinusGix ( https://github.com/MinusGix )
  * @version v1.0.0
  * @module UAC
  */

import {
  createHash,
} from 'node:crypto';
import {
  getChannelSettings,
} from './_Channels.js';

/**
  * Object defining labels for default permission ranges
  * @typedef {Object} levels
  * @property {number} admin Global administrator range
  * @property {number} moderator Global moderator range
  * @property {number} channelOwner Local administrator range
  * @property {number} channelModerator Local moderator range
  * @property {number} channelTrusted Local (non-public) channel trusted
  * @property {number} trustedUser Public channel trusted
  * @property {number} default Default user level
  */
export const levels = {
  admin: 9999999,
  moderator: 999999,

  channelOwner: 99999,
  channelModerator: 9999,
  channelTrusted: 8999,

  trustedUser: 500,
  default: 100,
};

/**
  * Returns true if target level is equal or greater than the global admin level
  * @public
  * @param {number} level Level to verify
  * @return {boolean}
  */
export function isAdmin(level) {
  return level >= levels.admin;
}

/**
  * Returns true if target level is equal or greater than the global moderator level
  * @public
  * @param {number} level Level to verify
  * @return {boolean}
  */
export function isModerator(level) {
  return level >= levels.moderator;
}

/**
  * Returns true if target level is equal or greater than the channel owner level
  * @public
  * @param {number} level Level to verify
  * @return {boolean}
  */
export function isChannelOwner(level) {
  return level >= levels.channelOwner;
}

/**
  * Returns true if target level is equal or greater than the channel moderator level
  * @public
  * @param {number} level Level to verify
  * @return {boolean}
  */
export function isChannelModerator(level) {
  return level >= levels.channelModerator;
}

/**
  * Returns true if target level is equal or greater than the channel trust level
  * @public
  * @param {number} level Level to verify
  * @return {boolean}
  */
export function isChannelTrusted(level) {
  return level >= levels.channelTrusted;
}

/**
  * Returns true if target level is equal or greater than a trusted user
  * @public
  * @param {number} level Level to verify
  * @return {boolean}
  */
export function isTrustedUser(level) {
  return level >= levels.trustedUser;
}

/**
  * Return an object containing public information about the socket
  * @public
  * @param {WebSocket} socket Target client
  * @return {Object}
  */
export function getUserDetails(socket) {
  return {
    nick: socket.nick,
    trip: socket.trip || '',
    uType: socket.uType,
    hash: socket.hash,
    level: socket.level,
    userid: socket.userid,
    isBot: socket.isBot,
    color: socket.color,
    online: true,
  };
}

/**
  * Returns true if the nickname is valid
  * @public
  * @param {string} nick Nickname to verify
  * @return {boolean}
  */
export function verifyNickname(nick) {
  if (typeof nick === 'undefined') return false;

  return /^[a-zA-Z0-9_]{1,24}$/.test(nick);
}

/**
  * Hashes a user's password, returning a trip code
  * or a blank string
  * @public
  * @param {string} pass User's password
  * @param {buffer} salt Server salt data
  * @param {string} config Server config object
  * @param {string} channel Channel-level permissions check
  * @return {string}
  */
export function getUserPerms(pass, salt, config, channel) {
  if (!pass) {
    return {
      trip: '',
      level: levels.default,
    };
  }

  const trip = createHash('sha256').update(pass + salt, 'utf8').digest('base64').substr(0, 6);

  // check if user is global admin
  if (trip === config.adminTrip) {
    return {
      trip: 'Admin',
      level: levels.admin,
    };
  }

  let level = levels.default;

  // check if user is global mod
  config.globalMods.forEach((mod) => { // eslint-disable-line consistent-return
    if (trip === mod.trip) {
      level = levels.moderator;
    }
  });

  const channelSettings = getChannelSettings(config, channel);
  if (channelSettings.owned) {
    if (channelSettings.ownerTrip === trip) {
      level = levels.channelOwner;
    } else if (typeof channelSettings.tripLevels[trip] !== 'undefined') {
      level = channelSettings.tripLevels[trip];
    }
  }

  return {
    trip,
    level,
  };
}
