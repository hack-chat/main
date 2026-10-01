/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Refresh modules
  * @version 1.1.0
  * @description Allows a remote user to clear and re-import the server command modules
  * @module reload
  */

import {
  Info,
} from '../utility/_Constants.js';
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
  if (!isAdmin(socket)) {
    return server.police.frisk(socket, 20);
  }

  const origCmds = {};
  const origCmdCount = core.commands.commands.length;

  // cache original command hashes for comparison
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

  // identify modified modules by comparing source hashes
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
    loadReport += `error(s):\n${loadResult}\n\n`;
  }

  // append optional reason to the report
  if (typeof payload.reason !== 'undefined') {
    loadReport += ` Reason: ${payload.reason}`;
  }

  // return success message to admin
  server.reply({
    cmd: 'info',
    text: loadReport,
    id: Info.Admin.RELOAD_STATUS,
    channel: payload.channel,
  }, socket);

  // send results to global moderators
  server.broadcast({
    cmd: 'info',
    text: loadReport,
    id: Info.Admin.RELOAD_STATUS,
    channel: false,
  }, (client) => isModerator(client));

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
