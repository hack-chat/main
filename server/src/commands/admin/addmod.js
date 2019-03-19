/*
  Description: Adds the target trip to the mod list then elevates the uType
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    return server._police.frisk(socket.remoteAddress, 20);
  }

  // add new trip to config
  core.config.mods.push({ trip: data.trip });

  // find targets current connections
  let newMod = server.findSockets({ trip: data.trip });
  if (newMod.length !== 0) {
    for (let i = 0, l = newMod.length; i < l; i++) {
      // upgrade privilages
      newMod[i].uType = 'mod';

      // inform new mod
      server.send({
        cmd: 'info',
        text: 'You are now a mod.'
      }, newMod[i]);
    }
  }

  // return success message
  server.reply({
    cmd: 'info',
    text: `Added mod trip: ${data.trip}, remember to run 'saveconfig' to make it permanent`
  }, socket);

  // notify all mods
  server.broadcast({
    cmd: 'info',
    text: `Added mod: ${data.trip}`
  }, { uType: 'mod' });
};

// module meta
exports.requiredData = ['trip'];
exports.info = {
  name: 'addmod',
  description: 'Adds target trip to the config as a mod and upgrades the socket type',
  usage: `
    API: { cmd: 'addmod', trip: '<target trip>' }`
};
