/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Update name color
  * @version 1.1.0
  * @description Allows calling client to change their nickname color
  * @module changecolor
  */

import {
  getSession,
} from './session.js';
import {
  getUserDetails,
} from '../utility/_UAC.js';
import {
  verifyColor,
} from '../utility/_Text.js';
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
  core, server, socket, payload,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 1);
  }

  const { channel } = socket;

  if (server.police.frisk(socket, 1)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are changing colors too fast. Wait a moment before trying again.',
      id: Errors.Global.RATELIMIT,
      channel, // @todo Multichannel
    }, socket);
  }

  // verify user data is string
  if (typeof payload.color !== 'string') {
    return false;
  }

  // make sure requested nickname meets standards
  const newColor = payload.color.trim().toUpperCase().replace(/#/g, '');
  if (newColor !== 'RESET' && !verifyColor(newColor)) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid color! Color must be in hex value',
      id: Errors.ChangeColor.INVALID_COLOR,
      channel, // @todo Multichannel
    }, socket);
  }

  if (newColor === 'RESET') {
    socket.color = false; // eslint-disable-line no-param-reassign
  } else {
    if (socket.color === newColor) return true;

    socket.color = newColor; // eslint-disable-line no-param-reassign
  }

  // build update notice with new color
  const updateNotice = {
    ...getUserDetails(socket),
    ...{
      cmd: 'updateUser',
      channel: socket.channel, // @todo Multichannel
    },
  };

  // notify channel that the user has changed their name
  // @todo this should be sent to every channel the user is in (multichannel)
  server.broadcast(updateNotice, { channel: socket.channel });

  server.reply({
    cmd: 'session',
    restored: false,
    token: getSession(socket, core),
    channels: socket.channels,
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.colorCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
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

  if (payload.text.startsWith('/color ')) {
    const input = payload.text.split(' ');

    // if there is no color target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid color! Color must be in hex value',
        id: Errors.ChangeColor.INVALID_COLOR,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'changecolor',
        color: input[1],
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "color"
  * @public
  * @typedef {Array} changecolor/requiredData
  */
export const requiredData = ['color'];

/**
  * Module meta information
  * @public
  * @typedef {Object} changecolor/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'changecolor',
  category: 'core',
  description: 'Allows calling client to change their nickname color',
  usage: `
    API: { cmd: 'changecolor', color: '<new color as hex>' }
    Text: /color <new color as hex>
    Removal: /color reset`,
};
