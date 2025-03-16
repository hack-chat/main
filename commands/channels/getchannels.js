/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Get public channels
  * @version 1.0.0
  * @description Sends back the public channel list with user counts
  * @module getchannels
  */

import {
  Errors,
} from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ core, server, socket }) {
  if (server.police.frisk(socket, 4)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again.',
      id: Errors.Global.RATELIMIT,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const count = core.appConfig.data.publicChannels.length;
  const list = [];

  for (let i = 0; i < count; i += 1) {
    list[i] = {
      name: core.appConfig.data.publicChannels[i],
      count: 0,
    };
  }

  server.clients.forEach((client) => {
    if (client.channel) {
      const listIndex = core.appConfig.data.publicChannels.indexOf(client.channel);

      if (listIndex !== -1) {
        list[listIndex].count += 1;
      }
    }
  });

  // dispatch info
  return server.reply({
    cmd: 'publicchannels',
    // count,
    list,
  }, socket);
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runChatCheck.bind(this), 80);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function runChatCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return false;
  }

  if (payload.text.startsWith('/getchannels')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'getchannels',
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} getchannels/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'getchannels',
  category: 'core',
  description: 'Sends back the public channel list with user counts',
  usage: `
    API: { cmd: 'getchannels' }
    Text: /getchannels`,
};
