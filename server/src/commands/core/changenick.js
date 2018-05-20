/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

const name = 'changenick';

const verifyNickname = (nick) => {
  return /^[a-zA-Z0-9_]{1,24}$/.test(nick);
};

exports.run = async (core, server, socket, data) => {
  let warnObj = {
    cmd: 'warn',
    name
  };

  if (server._police.frisk(socket.remoteAddress, 6)) {
    warnObj.text = 'You are changing nicknames too fast. Wait a moment before trying again.';
    server.reply(warnObj, socket);

    return;
  }

  if (typeof data.nick !== 'string') {
    return;
  }

  let newNick = data.nick.trim();

  if (!verifyNickname(newNick)) {
    warnObj.text = 'Nickname must consist of up to 24 letters, numbers, and underscores';
    server.reply(warnObj, socket);

    return;
  }

  if (newNick.toLowerCase() == core.config.adminName.toLowerCase()) {
    server._police.frisk(socket.remoteAddress, 4);

    warnObj.text = 'Gtfo';
    server.reply(warnObj, socket);

    return;
  }

  let userExists = server.findSockets({
    channel: socket.channel,
    nick: (targetNick) => targetNick.toLowerCase() === newNick.toLowerCase()
  });

  if (userExists.length > 0) {
    // That nickname is already in that channel
    warnObj.text = 'Nickname taken';
    server.reply(warnObj, socket);

    return;
  }

  let peerList = server.findSockets({ channel: socket.channel });
  let leaveNotice = {
    cmd: 'onlineRemove',
    name,
    nick: socket.nick
  };
  let joinNotice = {
    cmd: 'onlineAdd',
    name,
    nick: newNick,
    trip: socket.trip || 'null',
    hash: server.getSocketHash(socket)
  };

  server.broadcast(leaveNotice, { channel: socket.channel });
  server.broadcast(joinNotice, { channel: socket.channel });
  server.broadcast({
    cmd: 'info',
    name,
    text: `${socket.nick} is now ${newNick}`
  }, { channel: socket.channel });

  socket.nick = newNick;
};

exports.requiredData = ['nick'];

exports.info = {
  name,
  usage: `${name} {nick}`,
  description: 'This will change your current connections nickname'
};
