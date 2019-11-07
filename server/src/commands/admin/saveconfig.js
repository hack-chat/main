/*
  Description: Writes the current config to disk
*/

// module main
export async function run(core, server, socket) {
  // increase rate limit chance and ignore if not admin
  if (socket.uType !== 'admin') {
    return server.police.frisk(socket.address, 20);
  }

  // attempt save, notify of failure
  if (!core.configManager.save()) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to save config, check logs.',
    }, socket);
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: 'Config saved!',
  }, socket);

  // notify mods #transparency
  server.broadcast({
    cmd: 'info',
    text: 'Config saved!',
  }, { uType: 'mod' });

  return true;
}

export const info = {
  name: 'saveconfig',
  description: 'Writes the current config to disk',
  usage: `
    API: { cmd: 'saveconfig' }`,
};
