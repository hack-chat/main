/* eslint no-console: 0 */

/*
  Description: Clears all bans and ratelimits
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run({ core, server, socket }) {
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
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unbanned all ip addresses`,
    channel: false, // @todo Multichannel, false for global
  }, { level: UAC.isModerator });

  return true;
}

export const info = {
  name: 'unbanall',
  description: 'Clears all banned ip addresses',
  usage: `
    API: { cmd: 'unbanall' }`,
};
