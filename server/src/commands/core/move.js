/*
  Description: Changes the current channel of the calling socket
*/

// module main
export async function run(core, server, socket, data) {
  // check for spam
  if (server.police.frisk(socket.address, 6)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are changing channels too fast. Wait a moment before trying again.',
    }, socket);
  }

  // check user input
  if (typeof data.channel !== 'string') {
    return true;
  }

  if (data.channel === '') {
    return server.reply({
      cmd: 'warn',
      text: 'Cannot move to an empty channel.',
    }, socket);
  }

  if (data.channel === socket.channel) {
    // they are trying to rejoin the channel
    return true;
  }

  // check that the nickname isn't already in target channel
  const currentNick = socket.nick.toLowerCase();
  const userExists = server.findSockets({
    channel: data.channel,
    nick: (targetNick) => targetNick.toLowerCase() === currentNick,
  });

  if (userExists.length > 0) {
    // That nickname is already in that channel
    return true;
  }

  // broadcast leave notice to peers
  const peerList = server.findSockets({ channel: socket.channel });

  if (peerList.length > 1) {
    for (let i = 0, l = peerList.length; i < l; i += 1) {
      server.reply({
        cmd: 'onlineRemove',
        nick: peerList[i].nick,
      }, socket);

      if (socket.nick !== peerList[i].nick) {
        server.reply({
          cmd: 'onlineRemove',
          nick: socket.nick,
        }, peerList[i]);
      }
    }
  }

  // TODO: import function from join module
  // broadcast join notice to new peers
  const newPeerList = server.findSockets({ channel: data.channel });
  const moveAnnouncement = {
    cmd: 'onlineAdd',
    nick: socket.nick,
    trip: socket.trip || 'null',
    hash: socket.hash,
  };
  const nicks = [];

  for (let i = 0, l = newPeerList.length; i < l; i += 1) {
    server.reply(moveAnnouncement, newPeerList[i]);
    nicks.push(newPeerList[i].nick);
  }

  nicks.push(socket.nick);

  // reply with new user list
  server.reply({
    cmd: 'onlineSet',
    nicks,
  }, socket);

  // commit change
  socket.channel = data.channel;

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.moveCheck.bind(this), 29);
}

export function moveCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/move ')) {
    const input = payload.text.split(' ');

    // If there is no channel target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help move` for instructions on how to use this command.',
      }, socket);

      return false;
    }

    this.run(core, server, socket, {
      cmd: 'move',
      channel: input[1],
    });

    return false;
  }

  return payload;
}

export const requiredData = ['channel'];
export const info = {
  name: 'move',
  description: 'This will change your current channel to the new one provided',
  usage: `
    API: { cmd: 'move', channel: '<target channel>' }
    Text: /move <new channel>`,
};
