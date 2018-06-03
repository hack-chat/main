/*
  Description: Used to relay warnings to clients internally
*/

exports.run = async (core, server, socket, data) => {
  if (data.cmdKey !== server._cmdKey) {
    // internal command attempt by client, increase rate limit chance and ignore
    server._police.frisk(socket.remoteAddress, 20);

    return;
  }

  server.reply({ cmd: 'warn', text: data.text }, socket);
};

exports.requiredData = ['cmdKey', 'text'];

exports.info = {
  name: 'socketreply',
  usage: 'Internal Use Only',
  description: 'Internally used to relay warnings to clients'
};
