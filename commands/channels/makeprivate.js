/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Sets channel to private
  * @version 1.1.0
  * @description Remove channel from being listed on the front page
  * @module makeprivate
  */

import {
  isChannelOwner,
  getUserLevel,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
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
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 10);
  }

  // require trip code for ownership verification
  if (!socket.trip) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed. You must have a trip code',
      id: Errors.Global.MISSING_TRIPCODE,
      channel: targetChannel,
    }, socket);
  }

  const requestLevel = getUserLevel(socket, targetChannel);

  // enforce channel owner permission
  if (!isChannelOwner(requestLevel)) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to make channel private: You may not do that',
      id: Errors.MakePrivate.MISSING_PERMS,
      channel: targetChannel,
    }, socket);
  }

  // check if channel is currently public
  const listingIndex = core.appConfig.data.publicChannels.indexOf(targetChannel);

  if (listingIndex === -1) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to make channel private: This channel is already private',
      id: Errors.MakePrivate.ALREADY_PRIVATE,
      channel: targetChannel,
    }, socket);
  }

  // remove from public directory
  core.appConfig.data.publicChannels.splice(listingIndex, 1);

  // confirm success to user
  server.reply({
    cmd: 'info',
    text: 'Config saved!',
    id: Info.Admin.CONFIG_SAVED,
    channel: targetChannel,
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
  server.registerHook('in', 'chat', this.chatHook.bind(this), 26);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/new payload, false = suppress, string = error
  */
export function chatHook({
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

  // intercept /makeprivate command
  if (payload.text.startsWith('/makeprivate')) {
    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'makeprivate',
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
  * @typedef {Object} makeprivate/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'makeprivate',
  category: 'channels',
  description: 'Remove channel from being listed on the front page',
  usage: `
    API: { cmd: 'makeprivate' }
    Text: /makeprivate`,
};
