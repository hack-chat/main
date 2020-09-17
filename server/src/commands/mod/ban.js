/* eslint no-console: 0 */
/*
  Description: Adds the target socket's ip to the ratelimiter
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof payload.userid !== 'number') {
    return true;
  }

  // find target user
  let badClient = server.findSockets({ channel: socket.channel, userid: payload.userid });

  if (badClient.length === 0) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'Could not find user in channel',
    }, socket);
  }

  [badClient] = badClient;
  const targetNick = badClient.nick;

  // i guess banning mods or admins isn't the best idea?
  if (badClient.level >= socket.level) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'Cannot ban other users of the same level, how rude',
    }, socket);
  }

  // commit arrest record
  server.police.arrest(badClient.address, badClient.hash);

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  // notify normal users
  server.broadcast({
    cmd: 'info',
    text: `Banned ${targetNick}`,
    user: UAC.getUserDetails(badClient),
  }, { channel: socket.channel, level: (level) => level < UAC.levels.moderator });

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} banned ${targetNick} in ${payload.channel}, userhash: ${badClient.hash}`,
    channel: payload.channel,
    user: UAC.getUserDetails(badClient),
    banner: UAC.getUserDetails(socket),
  }, { level: UAC.isModerator });

  // force connection closed
  badClient.terminate();

  // stats are fun
  core.stats.increment('users-banned');

  return true;
}

// export const requiredData = ['nick'];
export const info = {
  name: 'ban',
  description: 'Disconnects the target nickname in the same channel as calling socket & adds to ratelimiter',
  usage: `
    API: { cmd: 'ban', nick: '<target nickname>' }`,
};
