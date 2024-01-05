/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Refresh modules
  * @version 1.0.0
  * @description Allows a remote user to clear and re-import the server command modules
  * @module reload
  */

import {
  isAdmin,
  isModerator,
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

  // do command reload and store results
  let loadResult = await core.commands.reloadCommands();

  // clear and rebuild all module hooks
  server.loadHooks();

  // build reply based on reload results
  if (loadResult === '') {
    loadResult = `Reloaded ${core.commands.commands.length} commands, 0 errors`;
  } else {
    loadResult = `Reloaded ${core.commands.commands.length} commands, error(s):
      ${loadResult}`;
  }

  if (typeof payload.reason !== 'undefined') {
    loadResult += `\nReason: ${payload.reason}`;
  }

  // send results to moderators (which the user using this command is higher than)
  server.broadcast({
    cmd: 'info',
    text: loadResult,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} reload/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'reload',
  category: 'admin',
  description: 'Allows a remote user to clear and re-import the server command modules',
  usage: `
    API: { cmd: 'reload', reason: '<optional reason append>' }`,
};
