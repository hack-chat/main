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
  * Returns random rgb code
  * @return {string}
  */
const randomRGB = () => {
  const saturation = 0.80;
  const lightness = 0.65;
  const hue = Math.floor(Math.random() * 360);

  const k = (n) => (n + hue / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n) => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = `${Math.floor(255 * f(0)).toString(16)}`;
  const g = `${Math.floor(255 * f(8)).toString(16)}`;
  const b = `${Math.floor(255 * f(4)).toString(16)}`;

  return `${r}${g}${b}`;
};

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
  bot: 99,
};

/**
  * Object defining labels for default permission ranges
  * @typedef {Object} levelAppearance
  * @property {number} admin Global administrator range
  */
export const levelAppearance = {
  [levels.admin]: {
    color: 'd73737',
    flair: String.fromCodePoint(127775), // 🌟
  },
  [levels.moderator]: {
    color: '1fad83',
    flair: String.fromCodePoint(11088), // ⭐
  },
  [levels.channelOwner]: {
    color: 'dd8800',
    flair: String.fromCodePoint(128081), // 👑
  },
  [levels.channelModerator]: {
    color: '2fa1ee',
    flair: String.fromCodePoint(128171), // 💫
  },
  [levels.bot]: {
    color: '2fa1ee',
    flair: String.fromCodePoint(129302), // 🤖
  },
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
    flair: socket.flair,
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
  * Returns an object with 'color' and 'flair' properties
  * associated by level
  * @public
  * @param {number} level Provided level
  * @return {object}
  */
export function getAppearance(level) {
  if (typeof levelAppearance[level] !== 'undefined') {
    return levelAppearance[level];
  }

  return {
    color: randomRGB(),
    flair: false,
  };
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
