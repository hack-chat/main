/*

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

  server.broadcast({
    cmd: 'info',
    text: 'Config saved!'
  }, { uType: 'mod' });
};

exports.info = {
  name: 'saveconfig',
  usage: 'saveconfig',
  description: 'Saves current config'
};
