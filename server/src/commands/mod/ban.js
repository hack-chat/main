/*
  Description: Adds the target socket's ip to the ratelimiter
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
    return true;
  }

  // find target user
  const targetNick = data.nick;
  let badClients = server.findSockets({ channel: socket.channel, nick: targetNick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel',
    }, socket);
  }

  // i guess banning mods or admins isn't the best idea?
  if (badClients[0].level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'Cannot ban other users of the same level, how rude',
    }, socket);
  }

  // commit arrest record
  for (let i = 0; i < badClients.length; i++) {
    server.police.arrest(badClients[i].address, badClients[i].originalHash || badClients[i].hash);
  }

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  // notify normal users
  server.broadcast({
    cmd: 'info',
    text: `Banned ${targetNick}`,
    user: UAC.getUserDetails(badClients[0]),
  }, { channel: socket.channel, level: (level) => level < UAC.levels.moderator });

  const hashes = badClients.map(x => x.originalHash || x.hash).join(", ");
  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} banned ${targetNick} in ${socket.channel}, userhash: ${hashes}`,
    channel: socket.channel,
    user: UAC.getUserDetails(badClients[0]),
    banner: UAC.getUserDetails(socket),
  }, { level: UAC.isModerator });

  for (let i = 0; i < badClients.length; i++) {
    // force connection closed
    badClients[i].terminate();
  }

  // stats are fun
  core.stats.increment('users-banned');

  return true;
}

export const requiredData = ['nick'];
export const info = {
  name: 'ban',
  description: 'Disconnects the target nickname in the same channel as calling socket & adds to ratelimiter',
  usage: `
    API: { cmd: 'ban', nick: '<target nickname>' }`,
};
