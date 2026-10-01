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
  InactiveAfter,
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
  // basic channel name validation
  if (typeof channel !== 'string') return Errors.Channel.INVALID_NAME;
  if (channel === '') return Errors.Channel.INVALID_NAME;
  if (channel.length > 120) return Errors.Channel.INVALID_LENGTH;

  // block banned sockets
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
  // sha256 hash of the channel name
  return createHash('sha256').update(channel, 'utf8').digest('hex');
}

/**
  * Caches the target channel settings to storage
  * @public
  * @param {string} config Server config object
  * @param {string} channelHash Target channel hash
  * @param {function} cb Function to run after storing
  * @return {boolean}
  */
export function storeChannelSettings(config, channelHash, cb) {
  // determine storage path based on hash prefix
  const configPath = `./channels/${channelHash[0]}/${channelHash}.json`;

  const dataToWrite = { ...config.permissions[channelHash] };
  delete dataToWrite.channelHash;

  // save settings to disk
  writeFile(configPath, JSON.stringify(dataToWrite), cb);

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

  // remove file from disk
  try {
    unlinkSync(configPath);
  } catch (e) { /* Error handling not needed */ }

  // purge from memory cache
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

  // apply updates and bump access time
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

  // load settings into cache if missing
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

      // @todo Check expire date here, if too old; delete file and use DefaultChannelSettings
    }
  }

  // update cache metadata
  config.permissions[channelHash].lastAccessed = new Date();
  config.permissions[channelHash].channelHash = channelHash;

  return config.permissions[channelHash];
}

/**
  * Check for and remove inactive channels from memory
  * @public
  * @param {object} config Core config settings
  * @return {boolean}
  */
export function purgeInactiveChannels(config) {
  const inactiveDate = Date.now() - InactiveAfter;
  const recordNames = Object.keys(config.permissions);

  // sweep cache for expired records
  for (let i = 0; i < recordNames.length; i += 1) {
    if (config.permissions[recordNames[i]].lastAccessed <= inactiveDate) {
      if (config.permissions[recordNames[i]].owned) {
        // save owned channels before purging
        storeChannelSettings(config, recordNames[i], () => {
          delete config.permissions[recordNames[i]];
        });
      } else {
        // immediately drop unowned channels
        delete config.permissions[recordNames[i]];
      }
    }
  }

  return true;
}

/**
  * Apply a new permission level to the provided trip, within the provided channel
  * @public
  * @param {string} config Server config object
  * @param {string} channel Target channel name
  * @param {string} trip Target trip
  * @param {number} level New level
  * @return {string}
  */
export function setChannelTripLevel(config, channel, trip, level) {
  const channelSettings = getChannelSettings(config, channel);

  // verify channel is registered
  if (!channelSettings.owned) {
    return 'This channel has no owner.';
  }

  const currentTrips = Object.keys(config.permissions[channelSettings.channelHash].tripLevels);

  // handle trip limits and removals
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

  // apply new level
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

  // matcher function for target channel
  const channelMatcher = (channels) => {
    if (Array.isArray(channels) && channels.includes(payload.channel)) return true;
    return false;
  };

  // locate sockets by userid or nick
  if (typeof payload.userid !== 'undefined') {
    targetClients = server.findSockets({
      channels: channelMatcher,
      userid: payload.userid,
    });
  } else if (typeof payload.nick !== 'undefined') {
    targetClients = server.findSockets({
      channels: channelMatcher,
      nick: payload.nick,
    });
  } else {
    return [];
  }

  if (!targetClients) {
    return [];
  }

  // apply result limit if specified
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
  // returns the first match or false
  return findUsers(server, payload, 1)[0] || false;
}

/**
  * Check for socket duplicates in a channel
  * @param {MainServer} server Main server reference
  * @param {string} channel Target channel
  * @param {object} socket Target client to evaluate (to exclude self)
  * @return {boolean} True if ANOTHER socket with the same userid exists in the channel
  */
export function socketInChannel(server, channel, socket) {
  // find all sockets with this userid in this channel
  const users = findUsers(server, {
    channel,
    userid: socket.userid,
  });

  if (users.length === 0) return false;

  // filter out the current socket to see if others exist
  const otherSockets = users.filter((s) => s !== socket);

  return otherSockets.length > 0;
}
