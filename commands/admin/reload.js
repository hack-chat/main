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

  const origCmds = {};
  const origCmdCount = core.commands.commands.length;

  for (let i = 0; i < origCmdCount; i += 1) {
    origCmds[core.commands.commands[i].info.name] = {
      srcHash: core.commands.commands[i].info.srcHash,
    };
  }

  // do command reload and store results
  const loadResult = await core.commands.reloadCommands();

  // clear and rebuild all module hooks
  server.loadHooks();

  const changed = [];

  const newCmdCount = core.commands.commands.length;
  let cmdName = '';

  for (let i = 0; i < newCmdCount; i += 1) {
    cmdName = core.commands.commands[i].info.name;

    if (typeof origCmds[cmdName] !== 'undefined') {
      if (origCmds[cmdName].srcHash !== core.commands.commands[i].info.srcHash) {
        changed.push(`"${cmdName}"`);
      }
    }
  }

  // build reply based on reload results
  let loadReport = `Reloaded ${newCmdCount} commands, `;

  if (changed.length > 0) {
    loadReport += `changed module${changed.length > 1 ? 's' : ''} ${changed.join(', ')}, `;
  } else {
    loadReport += 'no modules changed, ';
  }

  if (loadResult === '') {
    loadReport += '0 errors.';
  } else {
    loadReport += `error(s):
${loadResult}\n\n`;
  }

  if (typeof payload.reason !== 'undefined') {
    loadReport += ` Reason: ${payload.reason}`;
  }

  // send results to moderators (which the user using this command is higher than)
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: loadReport,
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
