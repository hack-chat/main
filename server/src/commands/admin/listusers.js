/*

*/

'use strict';

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  let channels = {};
  for (var client of server.clients) {
    if (client.channel) {
      if (!channels[client.channel]) {
        channels[client.channel] = [];
      }
      channels[client.channel].push(client.nick);
    }
  }

  let lines = [];
  for (let channel in channels) {
    lines.push(`?${channel} ${channels[channel].join(", ")}`);
  }

  let text = '';
  text += lines.join("\n");

  server.reply({
    cmd: 'info',
    text: text
  }, socket);
};

exports.info = {
  name: 'listusers',
  usage: 'listusers',
  description: 'Outputs all current channels and sockets in those channels'
};
