/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Close channel and refund rent @todo
  * @version 1.0.0
  * @description Permanently close a channel, burning the channel and refunding storage rent
  * (Currently disabled)
  * @module closechannel
  */

import { Errors } from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 1);
  }

  // enforce rate limits
  if (server.police.frisk(socket, 3)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // issue destructive action warning
  server.reply({
    cmd: 'warn',
    text: 'WARNING: Closing this channel will permanently un-claim the namespace, wipe all moderators, refund your storage rent, and BURN your ownership',
    id: Errors.Channel.CLOSE_WARNING,
    channel: targetChannel,
  }, socket);

  // module currently disabled pending upgrade
  return server.reply({
    cmd: 'info',
    text: 'The /closechannel command is currently disabled pending a smart contract upgrade',
    // id: @todo
    channel: targetChannel,
  }, socket);
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
  if (typeof payload === 'undefined') return false;

  // verify user input
  if (typeof payload.text !== 'string') {
    return false;
  }

  const currentChannel = payload.channel;

  // intercept /closechannel command
  if (payload.text.startsWith('/closechannel')) {
    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'closechannel',
        channel: currentChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} closechannel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'closechannel',
  category: 'channels',
  description: 'Permanently close a channel, burning the channel and refunding storage rent (Currently Disabled)',
  usage: `
    API: { cmd: 'closechannel', channel: '<target channel>' }
    Text: /closechannel`,
};
