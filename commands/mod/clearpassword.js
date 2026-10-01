/* eslint no-param-reassign: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Removes the password from the channel
  * @version 1.0.0
  * @description Removes the channel password allowing normal join flow
  * @module clearpassword
  */

import { Info } from '../utility/_Constants.js';
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
  // initialize password storage if missing
  if (typeof core.passwords === 'undefined') {
    core.passwords = {};
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
    return server.police.frisk(socket, 10);
  }

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce moderator permission
  if (currentLevel < levels.channelModerator) {
    return server.police.frisk(socket, 10);
  }

  // check if a password is even set
  if (!core.passwords[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Channel does not currently have a password',
      id: Info.ChannelInfo.NO_PASS,
      channel: targetChannel,
    }, socket);
  }

  // disable password protection
  core.passwords[targetChannel] = false;

  // notify moderators
  server.broadcast({
    cmd: 'info',
    text: `Password protection removed on: ?${targetChannel} by [${socket.trip}]${socket.nick}`,
    id: Info.Mod.PASS_DISABLED,
    args: {
      targetChannel,
      trip: socket.trip,
      nick: socket.nick,
    },
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

  // intercept clearpassword command
  if (payload.text === '/clearpassword') {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'clearpassword',
        channel: payload.channel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} clearpassword/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'clearpassword',
  category: 'moderators',
  description: 'Removes the password requirement from the current channel',
  usage: `
    API: { cmd: 'clearpassword' }
    Text: /clearpassword`,
};
