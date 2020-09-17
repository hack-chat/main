/*
  Description: Removes target trip from the config as a mod and downgrades the socket type
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin
  if (!UAC.isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // remove trip from config
  // eslint-disable-next-line no-param-reassign
  core.config.mods = core.config.mods.filter((mod) => mod.trip !== payload.trip);

  // find targets current connections
  const targetMod = server.findSockets({ trip: payload.trip });
  if (targetMod.length !== 0) {
    for (let i = 0, l = targetMod.length; i < l; i += 1) {
      // downgrade privilages
      targetMod[i].uType = 'user';
      targetMod[i].level = UAC.levels.default;

      // inform ex-mod
      server.send({
        cmd: 'info',
        text: 'You are now a user.',
      }, targetMod[i]);
    }
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: `Removed mod trip: ${
      payload.trip
    }, remember to run 'saveconfig' to make it permanent`,
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Removed mod: ${payload.trip}`,
  }, { level: UAC.isModerator });

  return true;
}

export const requiredData = ['trip'];
export const info = {
  name: 'removemod',
  description: 'Removes target trip from the config as a mod and downgrades the socket type',
  usage: `
    API: { cmd: 'removemod', trip: '<target trip>' }`,
};
