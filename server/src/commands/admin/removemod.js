/*
  Description: Removes target trip from the config as a mod and downgrades the socket type
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    return server._police.frisk(socket.remoteAddress, 20);
  }

  // remove trip from config
  core.config.mods = core.config.mods.filter(mod => mod.trip !== data.trip);

  // find targets current connections
  let targetMod = server.findSockets({ trip: data.trip });
  if (targetMod.length !== 0) {
    for (let i = 0, l = targetMod.length; i < l; i++) {
      // downgrade privilages
      targetMod[i].uType = 'user';

      // inform ex-mod
      server.send({
        cmd: 'info',
        text: 'You are now a user.'
      }, targetMod[i]);
    }
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: `Removed mod trip: ${
      data.trip
    }, remember to run 'saveconfig' to make it permanent`
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Removed mod: ${data.trip}`
  }, { uType: 'mod' });
};

// module meta
exports.requiredData = ['trip'];
exports.info = {
  name: 'removemod',
  description: 'Removes target trip from the config as a mod and downgrades the socket type',
  usage: `
    API: { cmd: 'removemod', trip: '<target trip>' }`
};
