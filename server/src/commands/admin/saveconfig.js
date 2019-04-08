/*
  Description: Writes the current config to disk
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    return server.police.frisk(socket.remoteAddress, 20);
  }

  // attempt save, notify of failure
  if (!core.configManager.save()) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to save config, check logs.'
    }, client);
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: 'Config saved!'
  }, socket);

  // notify mods #transparency
  server.broadcast({
    cmd: 'info',
    text: 'Config saved!'
  }, { uType: 'mod' });
};

// module meta
exports.info = {
  name: 'saveconfig',
  description: 'Writes the current config to disk',
  usage: `
    API: { cmd: 'saveconfig' }`
};
