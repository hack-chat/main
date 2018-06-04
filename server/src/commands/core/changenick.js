/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

exports.run = async (core, server, socket, data) => {
  if (server._police.frisk(socket.remoteAddress, 6)) {
    server.reply({
      cmd: 'warn',
      text: 'You are changing nicknames too fast. Wait a moment before trying again.'
    }, socket);

    return;
  }

  // verify user data is string
  if (typeof data.nick !== 'string') {
    return;
  }

  // make sure requested nickname meets standards
  let newNick = data.nick.trim();
  if (!verifyNickname(newNick)) {
    server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores'
    }, socket);

    return;
  }

  // prevent admin impersonation
  // TODO: prevent mod impersonation
  if (newNick.toLowerCase() == core.config.adminName.toLowerCase()) {
    server._police.frisk(socket.remoteAddress, 4);

    server.reply({
      cmd: 'warn',
      text: 'Gtfo'
    }, socket);

    return;
  }

  // find any sockets that have the same nickname
  let userExists = server.findSockets({
    channel: socket.channel,
    nick: (targetNick) => targetNick.toLowerCase() === newNick.toLowerCase()
  });

  // return error if found
  if (userExists.length > 0) {
    // That nickname is already in that channel
    server.reply({
      cmd: 'warn',
      text: 'Nickname taken'
    }, socket);

    return;
  }

  // build join and leave notices
  let leaveNotice = {
    cmd: 'onlineRemove',
    nick: socket.nick
  };
  let joinNotice = {
    cmd: 'onlineAdd',
    nick: newNick,
    trip: socket.trip || 'null',
    hash: socket.hash
  };

  // broadcast remove event and join event with new name, this is to support legacy clients and bots
  server.broadcast( leaveNotice, { channel: socket.channel });
  server.broadcast( joinNotice, { channel: socket.channel });

  // notify channel that the user has changed their name
  server.broadcast( {
    cmd: 'info',
    text: `${socket.nick} is now ${newNick}`
  }, { channel: socket.channel });

  // commit change to nickname
  socket.nick = newNick;
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'changenick',
  usage: 'changenick {nick}',
  description: 'This will change your current connections nickname'
};
