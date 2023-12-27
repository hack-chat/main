/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Bridge warning events to a user
  * @version 1.0.0
  * @description If a warning occurs within the server, this module will relay the warning to the
  *   client
  * @module socketreply
  */

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  if (payload.cmdKey !== server.cmdKey) {
    // internal command attempt by client, increase rate limit chance and ignore
    return server.police.frisk(socket, 20);
  }

  // send warning to target socket
  return server.reply({
    cmd: 'warn',
    text: payload.text,
  }, socket);
}

/**
  * The following payload properties are required to invoke this module:
  * "cmdKey", "text"
  * @public
  * @typedef {Array} socketreply/requiredData
  */
export const requiredData = ['cmdKey', 'text'];

/**
  * Module meta information
  * @public
  * @typedef {Object} socketreply/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'socketreply',
  category: 'internal',
  description: 'Internally used to relay warnings to clients',
  usage: 'Internal Use Only',
};
