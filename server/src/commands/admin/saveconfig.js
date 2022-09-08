/*
  Description: Writes the current config to disk
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket) {
  // increase rate limit chance and ignore if not admin
  if (!UAC.isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // attempt save, notify of failure
  if (!core.configManager.save()) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to save config, check logs.',
    }, socket);
  }

  // return success message to moderators and admins
  server.broadcast({
    cmd: 'info',
    text: 'Config saved!',
  }, { level: UAC.isModerator });

  return true;
}
export function initHooks(server) {
  server.registerHook('in', 'chat', this.saveconfigCheck.bind(this));
}
//Faster operation
export function saveconfigCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
      return false;
  }
  if (payload.text.startsWith('/saveconfig')) {
      const input = payload.text.split(' ');
      this.run(core, server, socket, {
          cmd: 'saveconfig',
      });
      return false;
  }
  return payload;
}
export const info = {
  name: 'saveconfig',
  description: 'Writes the current config to disk',
  usage: `
    API: { cmd: 'saveconfig' }
    Text: /saveconfig`,
};
