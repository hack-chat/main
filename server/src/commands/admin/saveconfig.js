/*
  Description: Writes any changes to the config to the disk
*/

const name = 'saveconfig';

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  let saveResult = core.managers.config.save();

  if (!saveResult) {
    server.reply({
      cmd: 'warn',
      name,
      text: 'Failed to save config, check logs.'
    }, client);

    return;
  }

  var obj = {
    cmd: 'info',
    name,
    text: 'Config saved!'
  };

  server.reply(obj, socket);

  server.broadcast(obj, { uType: 'mod' });
};

exports.info = {
  name,
  description: 'Saves current config'
};
