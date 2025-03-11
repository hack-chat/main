/**
  * @author Marzavec
  * @summary Sets channel to private
  * @version 1.0.0
  * @description Remove channel from being listed on the front page
  * @module makeprivate
  */

import {
  isChannelOwner,
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
  core, server, socket,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 10);
  }

  if (!socket.trip) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to run command: You must have a trip code to do this.',
      id: Errors.Global.MISSING_TRIPCODE,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (!isChannelOwner(socket.level)) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to make channel private: You may not do that',
      id: Errors.MakePrivate.MISSING_PERMS,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const listingIndex = core.appConfig.data.publicChannels.indexOf(socket.channel);

  if (listingIndex === -1) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to make channel private: This channel is already private',
      id: Errors.MakePrivate.ALREADY_PRIVATE,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  core.appConfig.data.publicChannels.splice(listingIndex, 1);

  server.reply({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: 'This channel has been removed from the list of public channels',
    channel: socket.channel, // @todo Multichannel
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

  if (payload.text.startsWith('/makeprivate')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'makeprivate',
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
