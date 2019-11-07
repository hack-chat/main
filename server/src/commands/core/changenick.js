/*
  Description: Allows calling client to change their current nickname
*/

// module support functions
const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

// module main
export async function run(core, server, socket, data) {
  if (server.police.frisk(socket.address, 6)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are changing nicknames too fast. Wait a moment before trying again.',
    }, socket);
  }

  // verify user data is string
  if (typeof data.nick !== 'string') {
    return true;
  }

  // make sure requested nickname meets standards
  const newNick = data.nick.trim();
  if (!verifyNickname(newNick)) {
    return server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
    }, socket);
  }

  // prevent admin impersonation
  // TODO: prevent mod impersonation
  if (newNick.toLowerCase() === core.config.adminName.toLowerCase()) {
    server.police.frisk(socket.address, 4);

    return server.reply({
      cmd: 'warn',
      text: 'You are not the admin, liar!',
    }, socket);
  }

  // find any sockets that have the same nickname
  const userExists = server.findSockets({
    channel: socket.channel,
    nick: (targetNick) => targetNick.toLowerCase() === newNick.toLowerCase(),
  });

  // return error if found
  if (userExists.length > 0) {
    // That nickname is already in that channel
    return server.reply({
      cmd: 'warn',
      text: 'Nickname taken',
    }, socket);
  }

  // build join and leave notices
  // TODO: this is a legacy client holdover, name changes in the future will
  //       have thieir own event
  const leaveNotice = {
    cmd: 'onlineRemove',
    nick: socket.nick,
  };

  const joinNotice = {
    cmd: 'onlineAdd',
    nick: newNick,
    trip: socket.trip || 'null',
    hash: socket.hash,
  };

  // broadcast remove event and join event with new name, this is to support legacy clients and bots
  server.broadcast(leaveNotice, { channel: socket.channel });
  server.broadcast(joinNotice, { channel: socket.channel });

  // notify channel that the user has changed their name
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} is now ${newNick}`,
  }, { channel: socket.channel });

  // commit change to nickname
  socket.nick = newNick;

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.nickCheck, 29);
}

// hooks chat commands checking for /nick
export function nickCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/nick')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help nick` for instructions on how to use this command.',
      }, socket);

      return false;
    }

    const newNick = input[1].replace(/@/g, '');

    this.run(core, server, socket, {
      cmd: 'changenick',
      nick: newNick,
    });

    return false;
  }

  return payload;
}

export const requiredData = ['nick'];
export const info = {
  name: 'changenick',
  description: 'This will change your current connections nickname',
  usage: `
    API: { cmd: 'changenick', nick: '<new nickname>' }
    Text: /nick <new nickname>`,
};
