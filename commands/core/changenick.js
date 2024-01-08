/* eslint eqeqeq: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Update nickname
  * @version 1.0.0
  * @description Allows calling client to change their current nickname
  * @module changenick
  */

import {
  verifyNickname,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  const { channel } = socket;

  if (server.police.frisk(socket, 6)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are changing nicknames too fast. Wait a moment before trying again.',
      id: Errors.Global.RATELIMIT,
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
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel, // @todo Multichannel
    }, socket);
  }

  if (newNick == previousNick) {
    return server.reply({
      cmd: 'warn',
      text: 'Nickname taken',
      id: Errors.Join.NAME_TAKEN,
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
      cmd: 'warn',
      text: 'Nickname taken',
      id: Errors.Join.NAME_TAKEN,
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
    },
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
      // @todo this should be sent to every channel the client is in (multichannel)
      server.send(updateNotice, peerList[i]);
    }
  }

  // notify channel that the user has changed their name
  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `${socket.nick} is now ${newNick}`,
    channel, // @todo Multichannel
  }, { channel });

  // commit change to nickname
  socket.nick = newNick; // eslint-disable-line no-param-reassign

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
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

  if (payload.text.startsWith('/nick')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (!input[1]) {
      server.reply({
        cmd: 'warn',
        text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
        id: Errors.Join.INVALID_NICK,
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
