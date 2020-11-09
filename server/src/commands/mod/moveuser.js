/*
  Description: Removes the target socket from the current channel and forces a join event in another
  @deprecated This module will be removed or replaced
*/

import {
  isModerator,
  getUserDetails,
} from '../utility/_UAC';

// module main
export async function run({ server, socket, payload }) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof payload.nick !== 'string' || typeof payload.channel !== 'string') {
    return true;
  }

  if (payload.channel === socket.channel) {
    // moving them into the same channel? y u do this?
    return true;
  }

  const badClients = server.findSockets({ channel: socket.channel, nick: payload.nick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'Could not find user in channel',
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const badClient = badClients[0];

  if (badClient.level >= socket.level) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'Cannot move other users of the same level, how rude',
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const currentNick = badClient.nick.toLowerCase();
  const userExists = server.findSockets({
    channel: payload.channel,
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
        userid: peerList[i].userid,
        nick: peerList[i].nick,
        channel: socket.channel, // @todo Multichannel
      }, badClient);

      if (badClient.nick !== peerList[i].nick) {
        server.reply({
          cmd: 'onlineRemove',
          userid: badClient.userid,
          nick: badClient.nick,
          channel: socket.channel, // @todo Multichannel
        }, peerList[i]);
      }
    }
  }

  const newPeerList = server.findSockets({ channel: payload.channel });
  const moveAnnouncement = {
    ...getUserDetails(badClient),
    ...{
      cmd: 'onlineAdd',
      channel: payload.channel, // @todo Multichannel
    },
  };
  const nicks = [];
  const users = [];
  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(moveAnnouncement, newPeerList[i]);

    nicks.push(newPeerList[i].nick); /* @legacy */
    users.push({
      ...{
        channel: payload.channel,
        isme: false,
      },
      ...getUserDetails(newPeerList[i]),
    });
  }

  nicks.push(badClient.nick); /* @legacy */
  users.push({
    ...{
      isme: true,
    },
    ...getUserDetails(badClient),
  });

  server.reply({
    cmd: 'onlineSet',
    nicks, /* @legacy */
    users,
    channel: payload.channel, // @todo Multichannel (?)
  }, badClient);

  badClient.channel = payload.channel;

  server.broadcast({
    cmd: 'info',
    text: `${badClient.nick} was moved into ?${payload.channel}`,
    channel: payload.channel, // @todo Multichannel
  }, { channel: payload.channel });

  return true;
}

export const requiredData = ['nick', 'channel'];
export const info = {
  name: 'moveuser',
  description: 'This will move the target user nick into another channel',
  usage: `
    API: { cmd: 'moveuser', nick: '<target nick>', channel: '<new channel>' }`,
};
