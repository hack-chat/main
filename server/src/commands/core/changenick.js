/* eslint eqeqeq: 0 */

/*
  Description: Allows calling client to change their current nickname
*/

import {
  verifyNickname,
  getUserDetails,
} from '../utility/_UAC';

// module main
export async function run({
  core, server, socket, payload,
}) {
  const channel = socket.channel;

  if (server.police.frisk(socket.address, 6)) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'You are changing nicknames too fast. Wait a moment before trying again.',
      channel, // @todo Multichannel
    }, socket);
  }

  // verify user data is string
  if (typeof payload.nick !== 'string') {
    return true;
  }

  const previousNick = socket.nick;

  // make sure requested nickname meets standards
  const newNick = payload.nick.trim();
  if (!verifyNickname(newNick)) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
      channel, // @todo Multichannel
    }, socket);
  }

  // prevent admin impersonation
  // @todo prevent mod impersonation
  if (newNick.toLowerCase() === core.config.adminName.toLowerCase()) {
    server.police.frisk(socket.address, 4);

    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'You are not the admin, liar!',
      channel, // @todo Multichannel
    }, socket);
  }

  if (newNick == previousNick) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'You already have that name',
      channel, // @todo Multichannel
    }, socket);
  }

  // find any sockets that have the same nickname
  const userExists = server.findSockets({
    channel,
    nick: (targetNick) => targetNick.toLowerCase() === newNick.toLowerCase()
      // Allow them to rename themselves to a different case
      && targetNick != previousNick,
  });

  // return error if found
  if (userExists.length > 0) {
    // That nickname is already in that channel
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'Nickname taken',
      channel, // @todo Multichannel
    }, socket);
  }

  // build update notice with new nickname
  const updateNotice = {
    ...getUserDetails(socket),
    ...{
      cmd: 'updateUser',
      nick: newNick,
      channel, // @todo Multichannel
    }
  };

  // build join and leave notices for legacy clients
  const leaveNotice = {
    cmd: 'onlineRemove',
    userid: socket.userid,
    nick: socket.nick,
    channel, // @todo Multichannel
  };

  const joinNotice = {
    ...getUserDetails(socket),
    ...{
      cmd: 'onlineAdd',
      nick: newNick,
      channel, // @todo Multichannel
    },
  };

  // gather channel peers
  const peerList = server.findSockets({ channel });
  for (let i = 0, l = peerList.length; i < l; i += 1) {
    if (peerList[i].hcProtocol === 1) {
      // send join/leave to legacy clients
      server.send(leaveNotice, peerList[i]);
      server.send(joinNotice, peerList[i]);
    } else {
      // send update info
      // @todo this should be sent to every channel the client is in
      server.send(updateNotice, peerList[i]);
    }
  }

  // notify channel that the user has changed their name
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} is now ${newNick}`,
    channel, // @todo Multichannel
  }, { channel });

  // commit change to nickname
  socket.nick = newNick; // eslint-disable-line no-param-reassign

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.nickCheck.bind(this), 29);
}

// hooks chat commands checking for /nick
export function nickCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/nick')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn', // @todo Add numeric error code as `id`
        text: 'Refer to `/help nick` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    const newNick = input[1].replace(/@/g, '');

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'changenick',
        nick: newNick,
      },
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
