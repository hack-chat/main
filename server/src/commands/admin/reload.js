/*
  Description: Clears and resets the command modules, outputting any errors
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin
  if (!UAC.isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // do command reload and store results
  let loadResult = core.dynamicImports.reloadDirCache();
  loadResult += core.commands.loadCommands();

  // clear and rebuild all module hooks
  server.loadHooks();

  // build reply based on reload results
  if (loadResult === '') {
    loadResult = `Reloaded ${core.commands.commands.length} commands, 0 errors`;
  } else {
    loadResult = `Reloaded ${core.commands.commands.length} commands, error(s):
      ${loadResult}`;
  }

  if (typeof data.reason !== 'undefined') {
    loadResult += `\nReason: ${data.reason}`;
  }

  // send results to moderators (which the user using this command is higher than)
  server.broadcast({
    cmd: 'info',
    text: loadResult,
  }, { level: UAC.isModerator });

  return true;
}
export function initHooks(server) {
  server.registerHook('in', 'chat', this.reloadCheck.bind(this));
}
//Faster operation
export function reloadCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
      return false;
  }
  if (payload.text.startsWith('/reload')) {
      const input = payload.text.split(' ');
      this.run(core, server, socket, {
          cmd: 'reload',
          reason: input[1]
      });
      return false;
  }
  return payload;
}
export const info = {
  name: 'reload',
  description: '(Re)loads any new commands into memory, outputs errors if any',
  usage: `
    API: { cmd: 'reload', reason: '<optional reason append>' }
    Text: /reload <optional reason append>`,
};
