/* eslint no-console: 0 */

/*
  Description: Removes a target ip from the ratelimiter
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof payload.ip !== 'string' && typeof payload.hash !== 'string') {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: "hash:'targethash' or ip:'1.2.3.4' is required",
    }, socket);
  }

  // find target
  let mode;
  let target;
  if (typeof payload.ip === 'string') {
    mode = 'ip';
    target = payload.ip;
  } else {
    mode = 'hash';
    target = payload.hash;
  }

  // remove arrest record
  server.police.pardon(target);

  // mask ip if used
  if (mode === 'ip') {
    target = server.getSocketHash(target);
  }
  console.log(`${socket.nick} [${socket.trip}] unbanned ${target} in ${socket.channel}`);

  // reply with success
  server.reply({
    cmd: 'info',
    text: `Unbanned ${target}`,
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unbanned: ${target}`,
  }, { level: UAC.isModerator });

  // stats are fun
  core.stats.decrement('users-banned');

  return true;
}

export const info = {
  name: 'unban',
  description: 'Removes target ip from the ratelimiter',
  usage: `
    API: { cmd: 'unban', ip/hash: '<target ip or hash>' }`,
};
