/*
  Description: Adds the target trip to the mod list then elevates the uType
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin
  if (!UAC.isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // add new trip to config
  core.config.mods.push({ trip: data.trip });

  // find targets current connections
  const newMod = server.findSockets({ trip: data.trip });
  if (newMod.length !== 0) {
    for (let i = 0, l = newMod.length; i < l; i += 1) {
      // upgrade privilages
      newMod[i].uType = 'mod';
      newMod[i].level = UAC.levels.moderator;

      // inform new mod
      server.send({
        cmd: 'info',
        text: 'You are now a mod.',   //When Mr_Zhang saw this message...
      }, newMod[i]);
    }
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: `Added mod trip: ${data.trip}, remember to run 'saveconfig' to make it permanent`,
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Added mod: ${data.trip}`,
  }, { level: UAC.isModerator });

  return true;
}
// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.addmodCheck.bind(this));
}
//Faster operation
export function addmodCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
      return false;
  }
  if (payload.text.startsWith('/addmod')) {
      const input = payload.text.split(' ');
      if (input[1] === undefined) {
          server.reply({
              cmd: 'warn',
              text: 'Refer to `/help addmod` for instructions on how to use this command.',
          }, socket);
          return false;
      }
      this.run(core, server, socket, {
          cmd: 'addmod',
          trip: input[1],
      });
      return false;
  }
  return payload;
}
export const requiredData = ['trip'];
export const info = {
  name: 'addmod',
  description: 'Adds target trip to the config as a mod and upgrades the socket type',
  usage: `
    API: { cmd: 'addmod', trip: '<target trip>' }`,
};
