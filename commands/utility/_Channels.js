/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Channel helper
  * @version 1.0.0
  * @description Functions to assist with channel manipulation
  * @module Channels
  */

import {
  existsSync,
  readFileSync,
  writeFile,
  unlinkSync,
} from 'node:fs';
import {
  createHash,
} from 'node:crypto';
import {
  levels,
} from './_UAC.js';
import {
  Errors,
  DefaultChannelSettings,
  MaxChannelTrips,
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
  * Returns the target channel's hash
  * @public
  * @param {string} channel Target channel
  * @return {string}
  */
export function getChannelHash(channel) {
  return createHash('sha256').update(channel, 'utf8').digest('hex');
}

/**
  * Caches the target channel settings to storage
  * @public
  * @param {string} config Server config object
  * @param {string} channel Target channel
  * @return {boolean}
  */
export function storeChannelSettings(config, channel) {
  const channelHash = getChannelHash(channel);
  const configPath = `./channels/${channelHash[0]}/${channelHash}.json`;

  delete config.permissions[channelHash].channelHash;

  writeFile(configPath, JSON.stringify(config.permissions[channelHash] || DefaultChannelSettings));

  return true;
}

/**
  * Deletes the target channel config file from storage and memory
  * @public
  * @param {string} config Server config object
  * @param {string} channel Target channel
  * @return {boolean}
  */
export function deleteChannelSettings(config, channel) {
  const channelHash = getChannelHash(channel);
  const configPath = `./channels/${channelHash[0]}/${channelHash}.json`;

  try {
    unlinkSync(configPath);
  } catch (e) { /* Error handling not needed */ }

  delete config.permissions[channelHash];

  return true;
}

/**
  * Applies new settings into the specified channel settings
  * @public
  * @param {string} config Server config object
  * @param {string} channel Target channel
  * @param {string} newSettings Updated channel settings
  * @return {object}
  */
export function updateChannelSettings(config, channel, newSettings) {
  const channelHash = getChannelHash(channel);
  const updatedSettings = {
    ...newSettings,
    ...config.permissions[channelHash],
  };

  config.permissions[channelHash] = updatedSettings;
  config.permissions[channelHash].lastAccessed = new Date();

  return updatedSettings;
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
  const channelHash = getChannelHash(channel);

  if (typeof config.permissions[channelHash] === 'undefined') {
    const configPath = `./channels/${channelHash[0]}/${channelHash}.json`;

    if (!existsSync(configPath)) {
      config.permissions[channelHash] = {
        ...DefaultChannelSettings,
      };
    } else {
      try {
        config.permissions[channelHash] = JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (e) {
        console.log(`Corrupted channel config: ${configPath}`);

        config.permissions[channelHash] = {
          ...DefaultChannelSettings,
        };
      }
    }

    // @todo Check last access date here, if too old; delete file and use DefaultChannelSettings
  }

  config.permissions[channelHash].lastAccessed = new Date();
  config.permissions[channelHash].channelHash = channelHash;

  return config.permissions[channelHash];
}

/**
  * Apply a new permission level to the provided trip, within the provided channel
  * @public
  * @param {string} config Server config object
  * @param {string} channel Target channel name
  * @param {string} trip Target trip
  * @param {number} level New level
  * @return {(string)}
  */
export function setChannelTripLevel(config, channel, trip, level) {
  const channelSettings = getChannelSettings(config, channel);

  if (!channelSettings.owned) {
    return 'This channel has no owner.';
  }

  const currentTrips = Object.keys(config.permissions[channelSettings.channelHash].tripLevels);

  if (currentTrips.length >= MaxChannelTrips) {
    if (level !== levels.default) {
      return 'Too many trips used. Remove trips by setting their level to default level.';
    }

    if (currentTrips.indexOf(trip) === -1) {
      return 'Invalid trip';
    }

    delete config.permissions[channelSettings.channelHash].tripLevels[trip];

    return '';
  }

  config.permissions[channelSettings.channelHash].tripLevels[trip] = level;

  return '';
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
