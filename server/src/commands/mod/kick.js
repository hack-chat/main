/*
  Description: Forces a change on the target(s) socket's channel, then broadcasts event
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
    return server._police.frisk(socket.remoteAddress, 10);
  }

  // check user input
  if (typeof data.nick !== 'string') {
    if (typeof data.nick !== 'object' && !Array.isArray(data.nick)) {
      return;
    }
  }

  // find target user(s)
  let badClients = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user(s) in channel'
    }, socket);
  }

  // check if found targets are kickable, commit kick
  let newChannel = '';
  let kicked = [];
  for (let i = 0, j = badClients.length; i < j; i++) {
    if (badClients[i].uType !== 'user') {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other mods, how rude'
      }, socket);
    } else {
      newChannel = Math.random().toString(36).substr(2, 8);
      badClients[i].channel = newChannel;

      // inform mods with where they were sent
      server.broadcast({
        cmd: 'info',
        text: `${badClients[i].nick} was banished to ?${newChannel}`
      }, { channel: socket.channel, uType: 'mod' });

      kicked.push(badClients[i].nick);
      console.log(`${socket.nick} [${socket.trip}] kicked ${badClients[i].nick} in ${socket.channel}`);
    }
  }

  if (kicked.length === 0) {
    return;
  }

  // broadcast client leave event
  for (let i = 0, j = kicked.length; i < j; i++) {
    server.broadcast({
      cmd: 'onlineRemove',
      nick: kicked[i]
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${kicked.join(', ')}`
  }, { channel: socket.channel, uType: 'user' });

  // stats are fun
  core.stats.increment('users-kicked', kicked.length);
};

// module meta
exports.requiredData = ['nick'];
exports.info = {
  name: 'kick',
  description: 'Silently forces target client(s) into another channel. `nick` may be string or array of strings',
  usage: `
    API: { cmd: 'kick', nick: '<target nick>' }`
};
