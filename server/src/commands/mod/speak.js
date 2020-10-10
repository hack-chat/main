/* eslint no-param-reassign: 0 */

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
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (typeof payload.ip === 'string') {
    if (payload.ip === '*') {
      core.muzzledHashes = {};

      return server.broadcast({
        cmd: 'info',
        text: `${socket.nick} unmuzzled all users`,
        channel: false, // @todo Multichannel, false for global
      }, { level: UAC.isModerator });
    }
  } else if (payload.hash === '*') {
    core.muzzledHashes = {};

    return server.broadcast({
      cmd: 'info',
      text: `${socket.nick} unmuzzled all users`,
      channel: false, // @todo Multichannel, false for global
    }, { level: UAC.isModerator });
  }

  // find target & remove mute status
  let target;
  if (typeof payload.ip === 'string') {
    target = server.getSocketHash(payload.ip);
  } else {
    target = payload.hash;
  }

  delete core.muzzledHashes[target];

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} unmuzzled : ${target}`,
    channel: false, // @todo Multichannel, false for global
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
