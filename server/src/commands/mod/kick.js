/* eslint no-console: 0 */

/*
  Description: Forces a change on the target(s) socket's channel, then broadcasts event
*/

import * as UAC from '../utility/UAC/_info';
import {
  Errors,
} from '../utility/_Constants';
import {
  findUsers,
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
      if (typeof payload.nick !== 'object' && !Array.isArray(payload.nick)) {
        return true;
      }
    }

    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  } else if (typeof payload.userid !== 'number') {
    // @todo create multi-ban ui
    if (typeof payload.userid !== 'object' && !Array.isArray(payload.userid)) {
      return true;
    }
  }

  // find target user(s)
  const badClients = findUsers(server, payload);
  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user(s) in that channel',
      id: Errors.Global.UNKNOWN_USER,
    }, socket);
  }

  // check if found targets are kickable, add them to the list if they are
  const kicked = [];
  for (let i = 0, j = badClients.length; i < j; i += 1) {
    if (badClients[i].level >= socket.level) {
      server.reply({
        cmd: 'warn',
        text: 'Cannot kick other users with the same level, how rude',
        id: Errors.Global.PERMISSION,
      }, socket);
    } else {
      kicked.push(badClients[i]);
    }
  }

  if (kicked.length === 0) {
    return true;
  }

  let destChannel;
  if (typeof payload.to === 'string' && !!payload.to.trim()) {
    destChannel = payload.to;
  } else {
    destChannel = Math.random().toString(36).substr(2, 8);
  }

  // Announce the kicked clients arrival in destChannel and that they were kicked
  // Before they arrive, so they don't see they got moved
  for (let i = 0; i < kicked.length; i += 1) {
    server.broadcast({
      cmd: 'onlineAdd',
      nick: kicked[i].nick,
      trip: kicked[i].trip || 'null',
      uType: 'user',
      hash: kicked[i].hash,
      level: UAC.levels.default,
      userid: kicked[i].userid,
      channel: destChannel,
    }, { channel: destChannel });
  }

  // Move all kicked clients to the new channel
  for (let i = 0; i < kicked.length; i += 1) {
    // @todo multi-channel update
    kicked[i].channel = destChannel;

    server.broadcast({
      cmd: 'info',
      text: `${kicked[i].nick} was banished to ?${destChannel}`,
    }, { channel: socket.channel, level: UAC.isModerator });

    console.log(`${socket.nick} [${socket.trip}] kicked ${kicked[i].nick} in ${socket.channel} to ${destChannel} `);
  }

  // broadcast client leave event
  for (let i = 0, j = kicked.length; i < j; i += 1) {
    server.broadcast({
      cmd: 'onlineRemove',
      userid: kicked[i].userid,
      nick: kicked[i].nick,
    }, { channel: socket.channel });
  }

  // publicly broadcast kick event
  server.broadcast({
    cmd: 'info',
    text: `Kicked ${kicked.map((k) => k.nick).join(', ')}`,
  }, { channel: socket.channel, level: (level) => level < UAC.levels.moderator });

  // stats are fun
  core.stats.increment('users-kicked', kicked.length);

  return true;
}

// export const requiredData = ['nick'];
export const info = {
  name: 'kick',
  description: 'Silently forces target client(s) into another channel. `nick` may be string or array of strings',
  usage: `
    API: { cmd: 'kick', nick: '<target nick>', to: '<optional target channel>' }`,
};
