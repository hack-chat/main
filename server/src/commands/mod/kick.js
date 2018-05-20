/*
  Description: Forces a change on the target socket's channel, then broadcasts event
*/

const name = 'kick';

exports.run = async (core, server, socket, data) => {
  if (socket.uType === 'user') {
    // ignore if not mod or admin
    return;
  }

  if (typeof data.nick !== 'string') {
    if (typeof data.nick !== 'object' && !Array.isArray(data.nick)) {
      return;
    }
  }

  let badClients = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClients.length === 0) {
    server.reply({
      cmd: 'warn',
      name,
      text: 'Could not find user(s) in channel'
    }, socket);

    return;
  }

  let newChannel = '';
  let kicked = [];
  for (let i = 0, j = badClients.length; i < j; i++) {
    if (badClients[i].uType !== 'user') {
      server.reply({
        cmd: 'warn',
        name,
        text: 'Cannot kick other mods, how rude'
      }, socket);
    } else {
      newChannel = Math.random().toString(36).substr(2, 8);
      badClients[i].channel = newChannel;

      // inform mods with where they were sent
      server.broadcast({
        cmd: 'info',
        name,
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
      name,
      nick: kicked[i]
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    name,
    text: `Kicked ${kicked.join(', ')}`
  }, { channel: socket.channel, uType: 'user' });

  core.managers.stats.increment('users-kicked', kicked.length);
};

exports.requiredData = ['nick'];

exports.info = {
  name,
  usage: `${name} {nick}`,
  description: 'Silently forces target client(s) into another channel. `nick` may be string or array of strings'
};