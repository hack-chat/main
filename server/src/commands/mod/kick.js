/*
  Description: Forces a change on the target(s) socket's channel, then broadcasts event
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
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
    if (badClients[i].level >= socket.level) {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other users with the same level, how rude',
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
  const seenNicks = [];
  for (let i = 0; i < kicked.length; i += 1) {
    // Only send this information for each unique user so multilogin users don't appear twice
    if (!seenNicks.includes(kicked[i].nick)) {
      server.broadcast({
        cmd: 'onlineAdd',
        nick: kicked[i].nick,
        trip: kicked[i].trip || 'null',
        hash: kicked[i].hash,
      }, { channel: destChannel });
      seenNicks.push(kicked[i].nick);
    }
  }

  for (let i = 0; i < kicked.length; i++) {
    kicked[i].channel = destChannel;
  }

  // Move all kicked clients to the new channel
  for (let i = 0; i < seenNicks.length; i++) {
    server.broadcast({
      cmd: 'info',
      text: `${seenNicks[i]} was banished to ?${destChannel}`,
    }, { channel: socket.channel, level: UAC.isModerator });

    console.log(`${socket.nick} [${socket.trip}] kicked ${seenNicks[i]} in ${socket.channel} to ${destChannel} `);

  }


  // broadcast client leave event
  for (let i = 0, j = seenNicks.length; i < j; i += 1) {
    server.broadcast({
      cmd: 'onlineRemove',
      nick: seenNicks[i],
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${seenNicks.join(', ')}`,
  }, { channel: socket.channel, level: (level) => level < UAC.levels.moderator });

  // stats are fun
  core.stats.increment('users-kicked', seenNicks.length);

  return true;
}

export const requiredData = ['nick'];
export const info = {
  name: 'kick',
  description: 'Silently forces target client(s) into another channel. `nick` may be string or array of strings',
  usage: `
    API: { cmd: 'kick', nick: '<target nick>', to: '<optional target channel>' }`,
};
