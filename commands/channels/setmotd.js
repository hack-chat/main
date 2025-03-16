/**
* @author Marzavec ( https://github.com/marzavec )
* @summary Change motd
* @version 1.0.0
* @description Update the channel motd to something new
* @module setmotd
*/

import {
  isChannelModerator,
} from '../utility/_UAC.js';
import {
  getChannelSettings,
  updateChannelSettings,
} from '../utility/_Channels.js';
import {
  Errors,
  MaxMOTDLength,
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
    return server.police.frisk(socket, 10);
  }

  if (server.police.frisk(socket, 6)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again.',
      id: Errors.Global.RATELIMIT,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // increase rate limit chance and ignore if not channel mod or better
  if (!isChannelModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  if (typeof payload.motd !== 'string' || payload.motd.length >= MaxMOTDLength) {
    return server.reply({
      cmd: 'warn',
      text: `Failed to set motd: Invalid motd, max length: ${MaxMOTDLength}`,
      MaxLength: MaxMOTDLength,
      id: Errors.SetMOTD.TOO_LONG,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

  channelSettings.motd = payload.motd;

  updateChannelSettings(core.appConfig.data, socket.channel, channelSettings);

  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: `MOTD changed by [${socket.trip}]${socket.nick}, new motd:`,
    channel: socket.channel, // @todo Multichannel
  }, { channel: socket.channel });

  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: channelSettings.motd,
    channel: socket.channel, // @todo Multichannel
  }, { channel: socket.channel });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 29);
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
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/setmotd')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'setmotd',
        motd: payload.text.substring(8).trim(),
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "motd"
  * @public
  * @typedef {Array} setmotd/requiredData
  */
export const requiredData = ['motd'];

/**
  * Module meta information
  * @public
  * @typedef {Object} setmotd/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'setmotd',
  category: 'channels',
  description: 'Update the channel motd to something new',
  usage: `
  API: { cmd: 'setmotd', motd: '[new motd]' }
  Text: /setmotd <new motd>`,
};
