/*
  Description: Adds the target trip to the mod list then elevates the uType
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

  let newMod = server.findSockets({ trip: data.trip });

  if (newMod.length !== 0) {
    for (let i = 0, l = newMod.length; i < l; i++) {
      newMod[i].uType = 'mod';

      server.send({
        cmd: 'info',
        text: 'You are now a mod.'
      }, newMod[i]);
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
