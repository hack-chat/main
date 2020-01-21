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

  let destChannel;
  if (typeof data.to === 'string' && !!data.to.trim()) {
    destChannel = data.to;
  } else {
    destChannel = Math.random().toString(36).substr(2, 8);
  }

  // find target user(s)
  const badClients = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user(s) in channel',
    }, socket);
  }

  // check if found targets are kickable, add them to the list if they are
  const kicked = [];
  for (let i = 0, j = badClients.length; i < j; i += 1) {
    if (badClients[i].uType !== 'user') {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other mods, how rude',
      }, socket);
    } else {
      kicked.push(badClients[i]);
    }
  }

  if (kicked.length === 0) {
    return true;
  }

  // Announce the kicked clients arrival in destChannel and that they were kicked
  // Before they arrive, so they don't see they got moved
  for (let i = 0; i < kicked.length; i++) {
    server.broadcast({
      cmd: 'onlineAdd',
      nick: kicked[i].nick,
      trip: kicked[i].trip || 'null',
      hash: kicked[i].userHash
    }, { channel: destChannel });
  }

  // Move all kicked clients to the new channel
  for (let i = 0; i < kicked.length; i++) {
    kicked[i].channel = destChannel;

    server.broadcast({
      cmd: 'info',
      text: `${kicked[i].nick} was banished to ?${destChannel}`,
    }, { channel: socket.channel, uType: 'mod' });

    console.log(`${socket.nick} [${socket.trip}] kicked ${kicked[i].nick} in ${socket.channel} to ${destChannel} `);
  }


  // broadcast client leave event
  for (let i = 0, j = kicked.length; i < j; i += 1) {
    server.broadcast({
      cmd: 'onlineRemove',
      nick: kicked[i].nick,
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${kicked.map(k => k.nick).join(', ')}`,
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
    API: { cmd: 'kick', nick: '<target nick>', to: '<optional target channel>' }`,
};
