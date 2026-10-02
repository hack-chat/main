/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Legacy protocol payload compatibility
  * @version 1.0.0
  * @description Injects missing channel properties for legacy (v1) clients
  * @module legacylayer
  */

/**
  * Executes when invoked by a remote client
  * @public
  * @return {void}
  */
export async function run() {
  // simply return true as no direct execution is needed
  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  const legacyCommands = [
    'chat',
    'invite',
    'changenick',
    'whisper',
    'emote',
    'stats',
    'ping',
    'updateMessage',
    'kick',
  ];

  // register hooks for all applicable legacy commands
  legacyCommands.forEach((cmd) => {
    server.registerHook('in', cmd, this.payloadCheck.bind(this), 3);
  });
}

/**
  * Executes every time an incoming command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function payloadCheck({ socket, payload }) {
  // validate payload existence
  if (typeof payload === 'undefined') {
    return false;
  }

  // inject missing channel property for v1 clients
  if (socket.hcProtocol === 1 && typeof payload.channel === 'undefined') {
    if (typeof socket.channels !== 'undefined') {
      payload.channel = socket.channels[0] || false;
    }
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} legacylayer/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'legacylayer',
  category: 'core',
  description: 'Injects missing channel properties for legacy (v1) clients',
  usage: `
    Internal hook module only`,
};
