/*
  Description: Removes the target socket from the current channel and forces a join event in another
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof data.nick !== 'string' || typeof data.channel !== 'string') {
    return true;
  }

  if (data.channel === socket.channel) {
    // moving them into the same channel? y u do this?
    return true;
  }

  const badClients = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel',
    }, socket);
  }

  const badClient = badClients[0];

  if (badClient.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'Cannot move other users of the same level, how rude',
    }, socket);
  }

  const currentNick = badClient.nick.toLowerCase();
  const userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === currentNick,
  });

  if (userExists.length > 0) {
    // That nickname is already in that channel
    return true;
  }

  const peerList = server.findSockets({ channel: socket.channel });

  if (peerList.length > 1) {
    for (let i = 0, l = peerList.length; i < l; i += 1) {
      server.reply({
        cmd: 'onlineRemove',
        nick: peerList[i].nick,
      }, badClient);

      if (badClient.nick !== peerList[i].nick) {
        server.reply({
          cmd: 'onlineRemove',
          nick: badClient.nick,
        }, peerList[i]);
      }
    }
  }

  // TODO: import from join module
  const newPeerList = server.findSockets({ channel: data.channel });
  const moveAnnouncement = {
    cmd: 'onlineAdd',
    nick: badClient.nick,
    trip: badClient.trip || 'null',
    hash: server.getSocketHash(badClient),
  };
  const nicks = [];

  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(moveAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick);
  }

  nicks.push(badClient.nick);

  server.reply({
    cmd: 'onlineSet',
    nicks,
  }, badClient);

  badClient.channel = data.channel;

  server.broadcast({
    cmd: 'info',
    text: `${badClient.nick} was moved into ?${data.channel}`,
  }, { channel: data.channel });

  return true;
}

export const requiredData = ['nick', 'channel'];
export const info = {
  name: 'moveuser',
  description: 'This will move the target user nick into another channel',
  usage: `
    API: { cmd: 'moveuser', nick: '<target nick>', channel: '<new channel>' }`,
};
