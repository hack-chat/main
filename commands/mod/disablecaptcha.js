/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Disables the captcha
  * @version 1.0.0
  * @description Disables the captcha on the channel specified in the channel property,
  *              default is current channel
  * @module disablecaptcha
  */

import {
  isModerator,
} from '../utility/_UAC.js';

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core enviroment object
  * @public
  * @return {void}
  */
export async function init(core) {
  if (typeof core.captchas === 'undefined') {
    core.captchas = {};
  }
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  let targetChannel;

  if (typeof payload.channel !== 'string') {
    if (typeof socket.channel !== 'string') { // @todo Multichannel
      return false; // silently fail
    }

    targetChannel = socket.channel;
  } else {
    targetChannel = payload.channel;
  }

  if (!core.captchas[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Captcha is not enabled.',
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  core.captchas[targetChannel] = false;

  server.broadcast({
    cmd: 'info',
    text: `Captcha disabled on: ${targetChannel}`,
    channel: false, // @todo Multichannel, false for global info
  }, { channel: targetChannel, level: isModerator });

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} disablecaptcha/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'disablecaptcha',
  category: 'moderators',
  description: 'Disables the captcha on the channel specified in the channel property, default is current channel',
  usage: `
    API: { cmd: 'disablecaptcha', channel: '<optional channel, defaults to your current channel' }`,
};
