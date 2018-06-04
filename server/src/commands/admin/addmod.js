/*
  Description: Adds the target trip to the mod list then elevates the uType
*/

exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    server._police.frisk(socket.remoteAddress, 20);

    return;
  }

  // add new trip to config
  core.config.mods.push({ trip: data.trip }); // purposely not using `config.set()` to avoid auto-save

  // upgarde existing connections & notify user
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

  // return success message
  server.reply({
    cmd: 'info',
    text: `Added mod trip: ${data.trip}`
  }, socket);

  // notify all mods
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
