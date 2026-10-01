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
  getUserLevel,
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
  let targetChannels = [];

  // resolve target channels
  if (payload.channel) {
    if (!socket.channels || !socket.channels.includes(payload.channel)) {
      return server.police.frisk(socket, 1);
    }
    targetChannels.push(payload.channel);
  } else {
    targetChannels = socket.channels || [];
  }

  // enforce rate limits
  if (server.police.frisk(socket, 1)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: payload.channel || false,
    }, socket);
  }

  // verify payload property
  if (typeof payload.color !== 'string') {
    return false;
  }

  // sanitize and validate color
  const newColor = payload.color.trim().toUpperCase().replace(/#/g, '');
  if (newColor !== 'RESET' && !verifyColor(newColor)) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid color! Color must be in hex value',
      id: Errors.ChangeColor.INVALID_COLOR,
      channel: payload.channel || false,
    }, socket);
  }

  if (!socket.channelStates) socket.channelStates = {};

  // update global socket color
  if (newColor === 'RESET') {
    socket.color = false;
  } else {
    socket.color = newColor;
  }

  // apply color and broadcast to target channels
  for (let i = 0, j = targetChannels.length; i < j; i += 1) {
    const targetChannel = targetChannels[i];
    const currentLevel = getUserLevel(socket, targetChannel);

    if (!socket.channelStates[targetChannel]) {
      socket.channelStates[targetChannel] = {
        level: currentLevel,
        trip: socket.trip,
      };
    }

    if (newColor === 'RESET') {
      delete socket.channelStates[targetChannel].color;
    } else {
      socket.channelStates[targetChannel].color = newColor;
    }

    const details = getUserDetails(socket, targetChannel);

    if (newColor !== 'RESET') {
      details.color = newColor;
    }

    server.broadcast({
      cmd: 'updateUser',
      ...details,
      channel: targetChannel,
    }, (client) => client.channels && client.channels.includes(targetChannel));
  }

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

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /color command
  if (payload.text.startsWith('/color ')) {
    const input = payload.text.split(' ');

    // require color parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid color! Color must be in hex value',
        id: Errors.ChangeColor.INVALID_COLOR,
        channel: targetChannel,
      }, socket);

      return false;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'changecolor',
        color: input[1],
        channel: targetChannel,
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
