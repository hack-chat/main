/**
  * @author Marzavec
  * @summary Disconnect a user's wallet
  * @version 1.0.0
  * @description Removes wallet session data and resets user state
  * @module disconnectwallet
  */

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
  server, socket,
}) {
  // Check if wallet exists
  if (typeof socket.wallet === 'undefined') {
    return server.reply({
      cmd: 'warn',
      text: 'No wallet currently connected',
      id: Errors.Global.LOGIN_REQUIRED,
      channel: socket.channel,
    }, socket);
  }

  const oldAddress = socket.wallet.address;
  delete socket.wallet;

  return server.reply({
    cmd: 'info',
    text: `Wallet disconnected (${oldAddress.slice(0, 4)}...${oldAddress.slice(-4)})`,
    id: Info.Wallet.DISCONNECTED,
    channel: socket.channel,
  }, socket);
}

/**
  * Module meta information
  * @public
  * @typedef {Object} disconnectwallet/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'disconnectwallet',
  category: 'wallet',
  description: 'Disconnects the currently attached Solana wallet',
  usage: `
    API: { cmd: 'disconnectwallet' }`,
};
