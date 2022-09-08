/*
  Description: Clears all bans and ratelimits
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // remove arrest records
  server.police.clear();

  core.stats.set('users-banned', 0);

  console.log(`${socket.nick} [${socket.trip}] unbanned all`);

  // reply with success
  server.reply({
    cmd: 'info',
    text: 'Unbanned all ip addresses',
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unbanned all ip addresses`,
  }, { level: UAC.isModerator });

  return true;
}
export function initHooks(server) {
  server.registerHook('in', 'chat', this.unbanallCheck.bind(this),11);
}
//Faster operation
export function unbanallCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
      return false;
  }
  if (payload.text.startsWith('/unbanall')) {
      //const input = payload.text.split(' ');
      this.run(core, server, socket, {
          cmd: 'unbanall'
      });
      return false;
  }
  return payload;
}
export const info = {
  name: 'unbanall',
  description: 'Clears all banned ip addresses',
  usage: `
    API: { cmd: 'unbanall' }
    Text: /unbanall`,
};
