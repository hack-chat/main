/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Removes a mod
  * @version 1.1.0
  * @description Removes target trip from the config as a mod and downgrades the socket type
  * @module removemod
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

  // remove trip from config
  // eslint-disable-next-line no-param-reassign
  core.appConfig.data.globalMods = core.appConfig.data.globalMods.filter(
    (mod) => mod.trip !== payload.trip,
  );

  // find target's current connections
  const targetMod = server.findSockets({ trip: payload.trip });

  if (targetMod.length !== 0) {
    for (let i = 0, l = targetMod.length; i < l; i += 1) {
      const targetSocket = targetMod[i];

      // downgrade global level
      targetSocket.globalLevel = levels.default;

      // update legacy properties
      targetSocket.uType = legacyLevelToLabel(levels.default);
      targetSocket.level = levels.default;

      // notify channel peers of downgrade
      targetSocket.channels.forEach((c) => {
        server.send({
          cmd: 'info',
          text: 'You are no longer a global moderator',
          id: Info.Admin.YOU_ARE_USER,
          channel: c,
        }, targetSocket);

        const updateNotice = {
          ...getUserDetails(targetSocket, c),
          ...{
            cmd: 'updateUser',
            channel: c,
          },
        };

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

  // return success message to admin
  server.reply({
    cmd: 'info',
    text: `Removed mod: ${payload.trip}`,
    id: Info.Admin.MOD_REMOVED,
    args: { trip: payload.trip },
    channel: payload.channel,
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Removed mod: ${payload.trip}`,
    id: Info.Admin.MOD_REMOVED,
    args: { trip: payload.trip },
    channel: false,
  }, (client) => isModerator(client));

  return true;
}

/**
  * The following payload properties are required to invoke this module:
  * "trip"
  * @public
  * @typedef {Array} removemod/requiredData
  */
export const requiredData = ['trip'];

/**
  * Module meta information
  * @public
  * @typedef {Object} removemod/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'removemod',
  category: 'admin',
  description: 'Removes target trip from the config as a mod and downgrades the socket type',
  usage: `
    API: { cmd: 'removemod', trip: '<target trip>' }`,
};
