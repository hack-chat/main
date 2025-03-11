/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Force a certain flair on a connection
  * @version 1.0.0
  * @description Force a certain flair on a connection
  * @module forceflair
  */

import {
  isModerator,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  findUser,
} from '../utility/_Channels.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  // check user input
  if (typeof payload.nick !== 'string') {
    return true;
  }

  if (typeof payload.flair !== 'string') {
    return true;
  }

  const { channel } = socket;
  if (typeof payload.channel === 'undefined') {
    payload.channel = channel;
  }

  // make sure requested flair meets standards
  const newFlair = payload.flair;
  if (!newFlair || newFlair.length > 2) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid flair',
      id: 11111,//Errors.ChangeColor.INVALID_COLOR,
      channel, // @todo Multichannel
    }, socket);
  }

  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel, // @todo Multichannel
    }, socket);
  }

  // @todo change this uType to use level / uac
  if (socket.nick !== targetUser.nick && targetUser.uType !== 'user') {
    return true;
  }

  targetUser.flair = newFlair;

  // build update notice with new flair
  const updateNotice = {
    ...getUserDetails(targetUser),
    ...{
      cmd: 'updateUser',
      channel, // @todo Multichannel
    },
  };

  // notify channel that the user has changed their flair
  // @todo this should be sent to every channel the user is in (multichannel)
  server.broadcast(updateNotice, { channel });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.flairCheck.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /forceflair
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function flairCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/forceflair ')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forceflair` for instructions on how to use this command.',
        id: 11111,//Errors.ForceColor.MISSING_NICK,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    if (input[2] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid newFlair',
        id: 11111,//Errors.ChangeColor.INVALID_COLOR,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'forceflair',
        nick: target,
        flair: input[2],
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "nick", "flair"
  * @public
  * @typedef {Array} forceflair/requiredData
  */
export const requiredData = ['nick', 'flair'];

/**
  * Module meta information
  * @public
  * @typedef {Object} forceflair/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'forceflair',
  category: 'moderators',
  description: 'Forces a flair onto a connection',
  usage: `
    API: { cmd: 'forceflair', nick: '<target nick>', flair: '<single utf flair>' }
    Text: /forceflair <target nick> <single utf flair>`,
};
