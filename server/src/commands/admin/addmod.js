/*
  Description: Adds the target trip to the mod list then elevates the uType
*/

const name = 'addmod';

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

  var obj = {
    cmd: 'info',
    name
  };

  if (newMod.length !== 0) {
    obj.text = 'You are now a mod.';

    for (let i = 0, l = newMod.length; i < l; i++) {
      newMod[i].uType = 'mod';

      server.send(obj, newMod[i]);
    }
  }

  obj.text = `Added mod trip: ${data.trip}`;
  server.reply(obj, socket);
  server.broadcast(obj, { uType: 'mod' });
};

exports.requiredData = ['trip'];

exports.info = {
  name,
  usage: `${name} {trip}`,
  description: 'Adds target trip to the config as a mod and upgrades the socket type'
};
