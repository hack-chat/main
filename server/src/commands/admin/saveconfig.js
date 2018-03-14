/*
  Description: Writes any changes to the config to the disk
*/

'use strict';

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  let saveResult = core.managers.config.save();

  if (!saveResult) {
    server.reply({
      cmd: 'warn',
      text: 'Failed to save config, check logs.'
    }, client);

    return;
  }

  server.reply({
    cmd: 'info',
    text: 'Config saved!'
  }, socket);

  server.broadcast({
    cmd: 'info',
    text: 'Config saved!'
  }, { uType: 'mod' });
};

exports.info = {
  name: 'saveconfig',
  description: 'Saves current config'
};
