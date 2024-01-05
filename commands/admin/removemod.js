/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Removes a mod
  * @version 1.0.0
  * @description Removes target trip from the config as a mod and downgrades the socket type
  * @module removemod
  */

import {
  isAdmin,
  isModerator,
  levels,
  getUserDetails,
} from '../utility/_UAC.js';

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
  if (!isAdmin(socket.level)) {
    return server.police.frisk(socket, 20);
  }

  // remove trip from config
  // eslint-disable-next-line no-param-reassign
  core.appConfig.data.globalMods = core.appConfig.data.globalMods.filter(
    (mod) => mod.trip !== payload.trip,
  );

  // find targets current connections
  const targetMod = server.findSockets({ trip: payload.trip });
  if (targetMod.length !== 0) {
    // build update notice with new privileges
    const updateNotice = {
      ...getUserDetails(targetMod[0]),
      ...{
        cmd: 'updateUser',
        uType: 'user', // @todo use legacyLevelToLabel from _LegacyFunctions.js
        level: levels.default,
      },
    };

    for (let i = 0, l = targetMod.length; i < l; i += 1) {
      // downgrade privileges
      targetMod[i].uType = 'user';
      targetMod[i].level = levels.default;

      // inform ex-mod
      server.send({
        cmd: 'info',
        text: 'You are now a user.',
        channel: targetMod[i].channel, // @todo Multichannel
      }, targetMod[i]);

      // notify channel
      server.broadcast({
        ...updateNotice,
        ...{
          channel: targetMod[i].channel,
        },
      }, { channel: targetMod[i].channel });
    }
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: `Removed mod trip: ${
      payload.trip
    }, remember to run 'saveconfig' to make it permanent`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Removed mod: ${payload.trip}`,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

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
