/*
  Description: Forces a change on the target(s) socket's channel, then broadcasts event
*/

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof data.nick !== 'string') {
    if (typeof data.nick !== 'object' && !Array.isArray(data.nick)) {
      return true;
    }
  }

  // find target user(s)
  const badClients = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user(s) in channel',
    }, socket);
  }

  // check if found targets are kickable, commit kick
  let newChannel = '';
  const kicked = [];
  for (let i = 0, j = badClients.length; i < j; i += 1) {
    if (badClients[i].uType !== 'user') {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other mods, how rude',
      }, socket);
    } else {
      newChannel = Math.random().toString(36).substr(2, 8);
      badClients[i].channel = newChannel;

      // inform mods with where they were sent
      server.broadcast({
        cmd: 'info',
        text: `${badClients[i].nick} was banished to ?${newChannel}`,
      }, { channel: socket.channel, uType: 'mod' });

      kicked.push(badClients[i].nick);
      console.log(`${socket.nick} [${socket.trip}] kicked ${badClients[i].nick} in ${socket.channel}`);
    }
  }

  if (kicked.length === 0) {
    return true;
  }

  // broadcast client leave event
  for (let i = 0, j = kicked.length; i < j; i += 1) {
    server.broadcast({
      cmd: 'onlineRemove',
      nick: kicked[i],
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${kicked.join(', ')}`,
  }, { channel: socket.channel, uType: 'user' });

  // stats are fun
  core.stats.increment('users-kicked', kicked.length);

  return true;
}

export const requiredData = ['nick'];
export const info = {
  name: 'kick',
  description: 'Silently forces target client(s) into another channel. `nick` may be string or array of strings',
  usage: `
    API: { cmd: 'kick', nick: '<target nick>' }`,
};
