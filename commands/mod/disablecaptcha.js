/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Disables the captcha
  * @version 1.1.0
  * @description Disables the captcha on the channel specified in the channel property,
  * default is current channel
  * @module disablecaptcha
  */

import {
  Info,
} from '../utility/_Constants.js';
import {
  isChannelModerator,
  levels,
  getUserLevel,
} from '../utility/_UAC.js';

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // initialize captcha tracking object
  if (typeof core.captchas === 'undefined') {
    core.captchas = {};
  }
}

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

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce moderator permission
  if (currentLevel < levels.channelModerator) {
    return server.police.frisk(socket, 10);
  }

  // check if captcha is already disabled
  if (!core.captchas[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Captcha is not enabled',
      id: Info.Captcha.NOT_ENABLED,
      channel: targetChannel,
    }, socket);
  }

  // disable captcha
  core.captchas[targetChannel] = false;

  // notify channel moderators
  server.broadcast({
    cmd: 'info',
    text: `Captcha disabled on: ?${targetChannel}`,
    id: Info.Captcha.DISABLED,
    args: { targetChannel },
    channel: targetChannel,
  }, (client) => {
    const inChannel = (client.channels && client.channels.includes(targetChannel));
    return inChannel && isChannelModerator(client, targetChannel);
  });

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 4);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  // always verify user input
  if (typeof payload.text !== 'string') return false;

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept disablecaptcha command
  if (payload.text === '/disablecaptcha') {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'disablecaptcha',
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
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
  description: 'Disables the captcha on the channel',
  usage: `
    API: { cmd: 'disablecaptcha', channel: '<optional channel>' }
    Text: /disablecaptcha`,
};
