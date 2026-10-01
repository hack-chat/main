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

// generate a random rgb hex color
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
// permission level constants
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
  * Object defining visual appearance (color/flair) for permission ranges
  * @typedef {Object} levelAppearance
  * @property {number} admin Global administrator range
  */
// visual flair and colors for specific levels
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
  * The Logic Cascade: Resolves the effective level for a user in a specific channel.
  * 1. Global Precedence: If user is a Global Admin/Mod, they override everything.
  * 2. Channel Specific: If user has a state in this channel, use that level.
  * 3. Fallback: Default level.
  * @public
  * @param {WebSocket} socket - The user's socket
  * @param {string} [channel] - The channel name to check permissions for
  * @return {number} The effective permission level
  */
export function getUserLevel(socket, channel) {
  // global ranks override channel ranks
  if (socket.globalLevel && socket.globalLevel >= levels.moderator) {
    return socket.globalLevel;
  }

  // use channel specific level if available
  if (channel && socket.channelStates && socket.channelStates[channel]) {
    return socket.channelStates[channel].level;
  }

  return levels.default;
}

/**
  * Returns true if target is a Global Admin
  * @public
  * @param {number|Object} input - Level number OR Socket object
  * @return {boolean}
  */
export function isAdmin(input) {
  const level = (typeof input === 'object') ? (input.globalLevel || 0) : input;
  return level >= levels.admin;
}

/**
  * Returns true if target is a Global Moderator
  * @public
  * @param {number|Object} input - Level number OR Socket object
  * @return {boolean}
  */
export function isModerator(input) {
  const level = (typeof input === 'object') ? (input.globalLevel || 0) : input;
  return level >= levels.moderator;
}

/**
  * Returns true if target level is equal or greater than the channel owner level
  * @public
  * @param {number|Object} input - Level number OR Socket object
  * @param {string} [channel] - Context channel if input is a socket
  * @return {boolean}
  */
export function isChannelOwner(input, channel) {
  const level = (typeof input === 'object') ? getUserLevel(input, channel) : input;
  return level >= levels.channelOwner;
}

/**
  * Returns true if target level is equal or greater than the channel moderator level
  * @public
  * @param {number|Object} input - Level number OR Socket object
  * @param {string} [channel] - Context channel if input is a socket
  * @return {boolean}
  */
export function isChannelModerator(input, channel) {
  const level = (typeof input === 'object') ? getUserLevel(input, channel) : input;
  return level >= levels.channelModerator;
}

/**
  * Returns true if target level is equal or greater than the channel trust level
  * @public
  * @param {number|Object} input - Level number OR Socket object
  * @param {string} [channel] - Context channel if input is a socket
  * @return {boolean}
  */
export function isChannelTrusted(input, channel) {
  const level = (typeof input === 'object') ? getUserLevel(input, channel) : input;
  return level >= levels.channelTrusted;
}

/**
  * Returns true if target level is equal or greater than the trust level
  * @public
  * @param {number|Object} input - Level number OR Socket object
  * @param {string} [channel] - Context channel if input is a socket
  * @return {boolean}
  */
export function isTrustedUser(input, channel) {
  const level = (typeof input === 'object') ? getUserLevel(input, channel) : input;
  return level >= levels.trustedUser;
}

/**
  * Returns an object with 'color' and 'flair' properties associated by level
  * @public
  * @param {number} level Provided level
  * @return {object}
  */
export function getAppearance(level) {
  const output = {
    color: randomRGB(),
    flair: false,
  };

  if (levelAppearance[level]) {
    output.flair = levelAppearance[level].flair;
  }

  return output;
}

/**
  * Return an object containing public information about the socket
  * tailored for a specific channel context.
  * @public
  * @param {WebSocket} socket Target client
  * @param {string} [channel] Context channel (optional)
  * @return {Object}
  */
export function getUserDetails(socket, channel) {
  const level = getUserLevel(socket, channel);
  const appearance = getAppearance(level);

  let finalColor = appearance.color;
  let finalFlair = appearance.flair;
  let finalEffect = socket.effect || 0;

  // apply global custom overrides
  if (socket.color) finalColor = socket.color;
  if (socket.flair) finalFlair = socket.flair;
  if (typeof socket.effect !== 'undefined') finalEffect = socket.effect;

  let trip = socket.trip || '';

  // apply channel specific overrides
  if (channel && socket.channelStates && socket.channelStates[channel]) {
    const state = socket.channelStates[channel];

    if (state.trip) trip = state.trip;
    if (state.color) finalColor = state.color;
    if (state.flair) finalFlair = state.flair;
    if (typeof state.effect !== 'undefined') finalEffect = state.effect;
  }

  // return assembled payload
  return {
    nick: socket.nick,
    trip,
    uType: socket.uType,
    hash: socket.hash,
    level,
    userid: socket.userid,
    isBot: socket.isBot || false,
    color: finalColor,
    flair: finalFlair,
    effect: finalEffect,
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
  * Hashes a user's password, returning a trip code and level.
  * Used by Join/Auth logic to populate socket.channelStates.
  * @public
  * @param {string} pass User's password
  * @param {buffer} salt Server salt data
  * @param {string} config Server config object
  * @param {string} channel Channel-level permissions check
  * @return {Object} { trip, level }
  */
export function getUserPerms(pass, salt, config, channel) {
  if (!pass) {
    return {
      trip: '',
      level: levels.default,
    };
  }

  // generate hash using sha256
  const trip = createHash('sha256').update(pass + salt, 'utf8').digest('base64').slice(0, 6);

  // global admin check
  if (trip === config.adminTrip) {
    return {
      trip: 'Admin',
      level: levels.admin,
    };
  }

  let level = levels.default;

  // global mod check
  if (config.globalMods) {
    config.globalMods.forEach((mod) => {
      if (trip === mod.trip) {
        level = levels.moderator;
      }
    });
  }

  // channel owner / channel mod check
  if (level < levels.moderator) {
    const channelSettings = getChannelSettings(config, channel);
    if (channelSettings.owned) {
      if (channelSettings.ownerTrip === trip) {
        level = levels.channelOwner;
      } else if (typeof channelSettings.tripLevels[trip] !== 'undefined') {
        level = channelSettings.tripLevels[trip];
      }
    }
  }

  return {
    trip,
    level,
  };
}
