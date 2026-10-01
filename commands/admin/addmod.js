/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Create a new mod trip
  * @version 1.1.0
  * @description Adds target trip to the config as a mod and upgrades the socket type
  * @module addmod
  */

import {
  Info,
} from '../utility/_Constants.js';
import {
  legacyLevelToLabel,
} from '../utility/_LegacyFunctions.js';
import {
  isAdmin,
  isModerator,
  levels,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  getSession,
} from '../core/session.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin
  if (!isAdmin(socket)) {
    return server.police.frisk(socket, 20);
  }

  // add new trip to config
  core.appConfig.data.globalMods.push({ trip: payload.trip });

  // find target's current connections
  const newMod = server.findSockets({ trip: payload.trip });

  if (newMod.length !== 0) {
    for (let i = 0, l = newMod.length; i < l; i += 1) {
      const targetSocket = newMod[i];

      // upgrade global level
      targetSocket.globalLevel = levels.moderator;

      // update legacy properties
      targetSocket.uType = legacyLevelToLabel(levels.moderator);
      targetSocket.level = levels.moderator;

      // notify all channels
      targetSocket.channels.forEach((c) => {
        // notify the user themselves
        server.send({
          cmd: 'info',
          text: 'You are now a mod',
          id: Info.Admin.YOU_ARE_MOD,
          channel: c,
        }, targetSocket);

        const updateNotice = {
          ...getUserDetails(targetSocket, c),
          ...{
            cmd: 'updateUser',
            channel: c,
          },
        };

        // notify channel peers of upgrade
        server.broadcast(updateNotice, (client) => client.channels && client.channels.includes(c));
      });

      // update session token
      server.reply({
        cmd: 'session',
        restored: false,
        token: getSession(targetSocket, core),
        channels: targetSocket.channels,
      }, targetSocket);
    }
  }

  // return success message to the admin
  server.reply({
    cmd: 'info',
    text: `Added mod: ${payload.trip}`,
    id: Info.Admin.MOD_ADDED,
    args: { trip: payload.trip },
    channel: payload.channel,
  }, socket);

  // notify all mods globally
  server.broadcast({
    cmd: 'info',
    text: `Added mod: ${payload.trip}`,
    id: Info.Admin.MOD_ADDED,
    args: { trip: payload.trip },
    channel: false,
  }, (client) => isModerator(client));

  return true;
}

/**
  * The following payload properties are required to invoke this module:
  * "trip"
  * @public
  * @typedef {Array} addmod/requiredData
  */
export const requiredData = ['trip'];

/**
  * Module meta information
  * @public
  * @typedef {Object} addmod/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'addmod',
  category: 'admin',
  description: 'Adds target trip to the config as a mod and upgrades the socket type',
  usage: `
    API: { cmd: 'addmod', trip: '<target trip>' }`,
};
