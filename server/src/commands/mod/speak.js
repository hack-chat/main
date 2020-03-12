/*
 * Description: Pardon a dumb user to be able to speak again
 * Author: simple
 */

import * as UAC from '../utility/UAC/_info';

// module constructor
export function init(core) {
  if (typeof core.muzzledHashes === 'undefined') {
    core.muzzledHashes = {};
  }
}

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof data.ip !== 'string' && typeof data.hash !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: "hash:'targethash' or ip:'1.2.3.4' is required",
    }, socket);
  }

  if (typeof data.ip === 'string') {
    if (data.ip === '*') {
      core.muzzledHashes = {};

      return server.broadcast({
        cmd: 'info',
        text: `${socket.nick} unmuzzled all users`,
      }, { level: UAC.isModerator });
    }
  } else if (data.hash === '*') {
    core.muzzledHashes = {};

    return server.broadcast({
      cmd: 'info',
      text: `${socket.nick} unmuzzled all users`,
    }, { level: UAC.isModerator });
  }

  // find target & remove mute status
  let target;
  if (typeof data.ip === 'string') {
    target = server.getSocketHash(data.ip);
  } else {
    target = data.hash;
  }

  delete core.muzzledHashes[target];

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unmuzzled : ${target}`,
  }, { level: UAC.isModerator });

  return true;
}

export const info = {
  name: 'speak',
  description: 'Pardon a dumb user to be able to speak again',
  usage: `
    API: { cmd: 'speak', ip/hash: '<target ip or hash' }`,
};
info.aliases = ['unmuzzle', 'unmute'];
