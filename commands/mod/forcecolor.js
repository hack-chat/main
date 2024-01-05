/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Color a user
  * @version 1.0.0
  * @description Forces a user nick to become a certain color
  * @module forcecolor
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
  * Validate a string as a valid hex color string
  * @param {string} color - Color string to validate
  * @private
  * @todo Move into utility module
  * @return {boolean}
  */
const verifyColor = (color) => /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(color);

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

  const { channel } = socket;
  if (typeof payload.channel === 'undefined') {
    payload.channel = channel;
  }

  // check user input
  if (typeof payload.nick !== 'string') {
    return true;
  }

  if (typeof payload.color !== 'string') {
    return true;
  }

  // make sure requested nickname meets standards
  const newColor = payload.color.trim().toUpperCase().replace(/#/g, '');
  if (newColor !== 'RESET' && !verifyColor(newColor)) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid color! Color must be in hex value',
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
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // TODO: Change this uType to use level / uac
  // i guess coloring mods or admins isn't the best idea?
  if (targetUser.uType !== 'user') {
    return true;
  }

  if (newColor === 'RESET') {
    targetUser.color = false;
  } else {
    targetUser.color = newColor;
  }

  // build update notice with new color
  const updateNotice = {
    ...getUserDetails(targetUser),
    ...{
      cmd: 'updateUser',
      channel: socket.channel, // @todo Multichannel
    },
  };

  // notify channel that the user has changed their name
  // @todo this should be sent to every channel the user is in (multichannel)
  server.broadcast(updateNotice, { channel: socket.channel });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.colorCheck.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /forcecolor
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function colorCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/forcecolor ')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forcecolor` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    if (input[2] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forcecolor` for instructions on how to use this command.',
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
        cmd: 'forcecolor',
        nick: target,
        color: input[2],
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "nick", "color"
  * @public
  * @typedef {Array} forcecolor/requiredData
  */
export const requiredData = ['nick', 'color'];

/**
  * Module meta information
  * @public
  * @typedef {Object} forcecolor/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'forcecolor',
  category: 'moderators',
  description: 'Forces a user nick to become a certain color',
  usage: `
    API: { cmd: 'forcecolor', nick: '<target nick>', color: '<color as hex>' }
Text: /forcecolor <target nick> <color as hex>`,
};
