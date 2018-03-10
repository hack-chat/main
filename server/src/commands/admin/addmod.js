/*

*/

'use strict';

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  let mod = {
    trip: data.trip
  }

  core.config.mods.push(mod); // purposely not using `config.set()` to avoid auto-save

  for (let client of server.clients) {
    if (typeof client.trip !== 'undefined' && client.trip === data.trip) {
      client.uType = 'mod';

      server.reply({
        cmd: 'info',
        text: 'You are now a mod.'
      }, client);
    }
  }

  server.reply({
    cmd: 'info',
    text: `Added mod trip: ${data.trip}`
  }, socket);

  server.broadcast({
    cmd: 'info',
    text: `Added mod trip: ${data.trip}`
  }, { uType: 'mod' });
};

exports.requiredData = ['trip'];

exports.info = {
  name: 'addmod',
  usage: 'addmod {trip}',
  description: 'Adds target trip to the config as a mod and upgrades the socket type'
};
