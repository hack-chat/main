/*
  Description: Removes the target socket from the current channel and forces a join event in another
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
    return server.police.frisk(socket.remoteAddress, 10);
  }

  // check user input
  if (typeof data.nick !== 'string' || typeof data.channel !== 'string') {
    return;
  }

  if (data.channel === socket.channel) {
    // moving them into the same channel? y u do this?
    return;
  }

  let badClients = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);
  }

  let badClient = badClients[0];

  if (badClient.uType !== 'user') {
    return server.reply({
      cmd: 'warn',
      text: 'Cannot move other mods, how rude'
    }, socket);
  }

  const currentNick = badClient.nick.toLowerCase();
  let userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === currentNick
  });

  if (userExists.length > 0) {
    // That nickname is already in that channel
    return;
  }

  let peerList = server.findSockets({ channel: socket.channel });

  if (peerList.length > 1) {
    for (let i = 0, l = peerList.length; i < l; i++) {
      server.reply({
        cmd: 'onlineRemove',
        nick: peerList[i].nick
      }, badClient);

      if (badClient.nick !== peerList[i].nick){
        server.reply({
          cmd: 'onlineRemove',
          nick: badClient.nick
        }, peerList[i]);
      }
    }
  }

  let newPeerList = server.findSockets({ channel: data.channel });
  let moveAnnouncement = {
    cmd: 'onlineAdd',
    nick: badClient.nick,
    trip: badClient.trip || 'null',
    hash: server.getSocketHash(badClient)
  };
  let nicks = [];

  for (let i = 0, l = newPeerList.length; i < l; i++) {
    server.reply(moveAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick);
  }

  nicks.push(badClient.nick);

  server.reply({
    cmd: 'onlineSet',
    nicks: nicks
  }, badClient);

  badClient.channel = data.channel;

  server.broadcast( {
    cmd: 'info',
    text: `${badClient.nick} was moved into ?${data.channel}`
  }, { channel: data.channel });
};

// module meta
exports.requiredData = ['nick', 'channel'];
exports.info = {
  name: 'moveuser',
  description: 'This will move the target user nick into another channel',
  usage: `
    API: { cmd: 'moveuser', nick: '<target nick>', channel: '<new channel>' }`
};
