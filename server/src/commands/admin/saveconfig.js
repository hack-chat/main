/*
  Description: Writes the current config to disk
*/

import {
  isAdmin,
  isModerator,
} from '../utility/_UAC';

// module main
export async function run({ core, server, socket }) {
  // increase rate limit chance and ignore if not admin
  if (!isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // attempt save, notify of failure
  if (!core.configManager.save()) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'Failed to save config, check logs.',
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // return success message to moderators and admins
  server.broadcast({
    cmd: 'info',
    text: 'Config saved!',
    channel: false, // @todo Multichannel
  }, { level: isModerator });

  return true;
}

export const info = {
  name: 'saveconfig',
  description: 'Writes the current config to disk',
  usage: `
    API: { cmd: 'saveconfig' }`,
};
