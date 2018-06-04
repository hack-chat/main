/*
  Description: Writes the current config to disk
*/

exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    server._police.frisk(socket.remoteAddress, 20);

    return;
  }

  // attempt save, notify of failure
  if (!core.managers.config.save()) {
    server.reply({
      cmd: 'warn',
      text: 'Failed to save config, check logs.'
    }, client);

    return;
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

exports.info = {
  name: 'saveconfig',
  description: 'Writes the current config to disk'
};
