/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Create a new mod trip
  * @version 1.0.0
  * @description Adds target trip to the config as a mod and upgrades the socket type
  * @module addmod
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

  // add new trip to config
  core.appConfig.data.globalMods.push({ trip: payload.trip });

  // find targets current connections
  const newMod = server.findSockets({ trip: payload.trip });
  if (newMod.length !== 0) {
    // build update notice with new privileges
    const updateNotice = {
      ...getUserDetails(newMod[0]),
      ...{
        cmd: 'updateUser',
        uType: 'mod', // @todo use legacyLevelToLabel from _LegacyFunctions.js
        level: levels.moderator,
      },
    };

    for (let i = 0, l = newMod.length; i < l; i += 1) {
      // upgrade privileges
      newMod[i].uType = 'mod'; // @todo use legacyLevelToLabel from _LegacyFunctions.js
      newMod[i].level = levels.moderator;

      // inform new mod
      server.send({
        cmd: 'info', // @todo Add numeric info code as `id`
        text: 'You are now a mod.',
        channel: newMod[i].channel, // @todo Multichannel
      }, newMod[i]);

      // notify channel
      server.broadcast({
        ...updateNotice,
        ...{
          channel: newMod[i].channel,
        },
      }, { channel: newMod[i].channel });
    }
  }

  // return success message
  server.reply({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `Added mod trip: ${payload.trip}, remember to run 'saveconfig' to make it permanent`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `Added mod: ${payload.trip}`,
    channel: false, // @todo Multichannel, false for global info
  }, { level: isModerator });

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
