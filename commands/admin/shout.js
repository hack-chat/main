/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Emit text everywhere
  * @version 1.0.0
  * @description Displays passed text to every client connected
  * @module shout
  */

import {
  isAdmin,
} from '../utility/_UAC.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  // increase rate limit chance and ignore if not admin
  if (!isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // send text to all channels
  server.broadcast({
    cmd: 'info',
    text: `Server Notice: ${payload.text}`,
    channel: false, // @todo Multichannel, false for global
  }, {});

  return true;
}

/**
  * The following payload properties are required to invoke this module:
  * "text"
  * @public
  * @typedef {Array} shout/requiredData
  */
export const requiredData = ['text'];

/**
  * Module meta information
  * @public
  * @typedef {Object} shout/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'shout',
  category: 'admin',
  description: 'Displays passed text to every client connected',
  usage: `
    API: { cmd: 'shout', text: '<shout text>' }
    Text: /shout <shout text>`,
  fastcmd:[
    {
      name:'text',
      len:0
    }
  ]
};
