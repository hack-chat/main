/* eslint eqeqeq: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Update nickname
  * @version 1.1.0
  * @description Allows calling client to change their current nickname
  * @module changenick
  */

import {
  verifyNickname,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  getSession,
} from './session.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 1);
  }

  // enforce rate limits
  if (server.police.frisk(socket, 6)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // verify user data is string
  if (typeof payload.nick !== 'string') {
    return true;
  }

  const previousNick = socket.nick;
  const newNick = payload.nick.trim();

  // make sure requested nickname meets standards
  if (!verifyNickname(newNick)) {
    return server.reply({
      cmd: 'warn',
      text: 'Username must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: targetChannel,
    }, socket);
  }

  // abort if no actual change
  if (newNick == previousNick) {
    return server.reply({
      cmd: 'warn',
      text: `Nickname taken in channel: ?${targetChannel}`,
      id: Errors.Join.NAME_TAKEN,
      args: { channel: targetChannel },
      channel: targetChannel,
    }, socket);
  }

  let collisionFound = false;
  let collisionChannel = '';

  // verify new nick is available across all joined channels
  for (let i = 0; i < socket.channels.length; i += 1) {
    const checkChannel = socket.channels[i];

    const userExists = server.findSockets((remoteSocket) => {
      const inChannel = (remoteSocket.channels && remoteSocket.channels.includes(checkChannel));

      return remoteSocket !== socket
        && inChannel
        && typeof remoteSocket.nick === 'string'
        && remoteSocket.nick.toLowerCase() === newNick.toLowerCase();
    });

    if (userExists.length > 0) {
      collisionFound = true;
      collisionChannel = checkChannel;
      break;
    }
  }

  // abort on cross-channel collision
  if (collisionFound) {
    return server.reply({
      cmd: 'warn',
      text: `Nickname taken in channel: ?${collisionChannel}`,
      id: Errors.Join.NAME_TAKEN,
      args: { channel: collisionChannel },
      channel: targetChannel,
    }, socket);
  }

  // commit change to nickname
  socket.nick = newNick; // eslint-disable-line no-param-reassign

  // update all channels
  socket.channels.forEach((chan) => {
    const userDetails = getUserDetails(socket, chan);

    // build update notice with new nickname
    const updateNotice = {
      ...userDetails,
      ...{
        cmd: 'updateUser',
        nick: newNick,
        channel: chan,
      },
    };

    // build join and leave notices for legacy clients
    const leaveNotice = {
      cmd: 'onlineRemove',
      userid: socket.userid,
      nick: previousNick,
      channel: chan,
    };

    const joinNotice = {
      ...userDetails,
      ...{
        cmd: 'onlineAdd',
        nick: newNick,
        channel: chan,
      },
    };

    // gather channel peers using the new multi-channel compatible lookup
    const peerList = server.findSockets((client) => client.channels
      && client.channels.includes(chan));

    // dispatch peer updates
    for (let i = 0, l = peerList.length; i < l; i += 1) {
      if (peerList[i].hcProtocol === 1) {
        server.send(leaveNotice, peerList[i]);
        server.send(joinNotice, peerList[i]);
      } else {
        server.send(updateNotice, peerList[i]);
      }
    }

    // notify channel text chat that the user has changed their name
    server.broadcast({
      cmd: 'info',
      text: `${previousNick} is now ${newNick}`,
      id: Info.Core.NICK_CHANGED,
      args: {
        previousNick,
        newNick,
      },
      channel: chan,
    }, (client) => {
      if (client.channels && client.channels.includes(chan)) {
        return true;
      }

      return false;
    });
  });

  // issue new token with updated state
  server.reply({
    cmd: 'session',
    restored: false,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.nickCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function nickCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /nick command
  if (payload.text.startsWith('/nick')) {
    const input = payload.text.split(' ');

    // require nickname parameter
    if (!input[1]) {
      return server.reply({
        cmd: 'warn',
        text: 'Username must consist of up to 24 letters, numbers, and underscores',
        id: Errors.Join.INVALID_NICK,
        channel: targetChannel,
      }, socket);
    }

    const newNick = input[1].replace(/@/g, '');

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'changenick',
        nick: newNick,
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "nick"
  * @public
  * @typedef {Array} changenick/requiredData
  */
export const requiredData = ['nick'];

/**
  * Module meta information
  * @public
  * @typedef {Object} changenick/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'changenick',
  category: 'core',
  description: 'Allows calling client to change their current nickname',
  usage: `
    API: { cmd: 'changenick', nick: '<new nickname>' }
    Text: /nick <new nickname>`,
};
