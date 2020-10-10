/* eslint no-console: 0 */
/*
  Description: Adds the target socket's ip to the ratelimiter
*/

import * as UAC from '../utility/UAC/_info';
import {
  Errors,
} from '../utility/_Constants';
import {
  findUser,
} from '../utility/_Channels';

// module main
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'string') {
      return true;
    }

    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  } else if (typeof payload.userid !== 'number') {
    return true;
  }

  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }
  const targetNick = targetUser.nick;

  // i guess banning mods or admins isn't the best idea?
  if (targetUser.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'Cannot ban other users of the same level, how rude',
      id: Errors.Global.PERMISSION,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // commit arrest record
  server.police.arrest(targetUser.address, targetUser.hash);

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  // notify normal users
  server.broadcast({
    cmd: 'info',
    text: `Banned ${targetNick}`,
    user: UAC.getUserDetails(targetUser),
    channel: socket.channel, // @todo Multichannel
  }, { channel: socket.channel, level: (level) => level < UAC.levels.moderator });

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} banned ${targetNick} in ${payload.channel}, userhash: ${targetUser.hash}`,
    channel: socket.channel, // @todo Multichannel
    inChannel: payload.channel,
    user: UAC.getUserDetails(targetUser),
    banner: UAC.getUserDetails(socket),
  }, { level: UAC.isModerator });

  // force connection closed
  targetUser.terminate();

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
