/*
  Description: Removes target trip from the config as a mod and downgrades the socket type
*/

import {
  isAdmin,
  isModerator,
  levels,
  getUserDetails,
} from '../utility/_UAC';

// module main
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin
  if (!isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // remove trip from config
  // eslint-disable-next-line no-param-reassign
  core.config.mods = core.config.mods.filter((mod) => mod.trip !== payload.trip);

  // find targets current connections
  const targetMod = server.findSockets({ trip: payload.trip });
  if (targetMod.length !== 0) {
    // build update notice with new privileges
    const updateNotice = {
      ...getUserDetails(targetMod[0]),
      ...{
        cmd: 'updateUser',
        uType: 'user', // @todo use legacyLevelToLabel from _LegacyFunctions.js
        level: levels.default,
      },
    };

    for (let i = 0, l = targetMod.length; i < l; i += 1) {
      // downgrade privilages
      targetMod[i].uType = 'user';
      targetMod[i].level = levels.default;

      // inform ex-mod
      server.send({
        cmd: 'info',
        text: 'You are now a user.',
        channel: targetMod[i].channel, // @todo Multichannel
      }, targetMod[i]);

      // notify channel
      server.broadcast({
        ...updateNotice,
        ...{
          channel: targetMod[i].channel,
        },
      }, { channel: targetMod[i].channel });
    }
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: `Removed mod trip: ${
      payload.trip
    }, remember to run 'saveconfig' to make it permanent`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Removed mod: ${payload.trip}`,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  return true;
}

export const requiredData = ['trip'];
export const info = {
  name: 'removemod',
  description: 'Removes target trip from the config as a mod and downgrades the socket type',
  usage: `
    API: { cmd: 'removemod', trip: '<target trip>' }`,
};
