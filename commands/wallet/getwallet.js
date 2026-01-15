/**
  * @author Marzavec
  * @summary Retrieve a user's wallet address
  * @version 1.0.0
  * @description Checks if a target user has a connected wallet and returns the address
  * @module getwallet
  */

import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  findUser,
} from '../utility/_Channels.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 1);
  }

  server.police.frisk(socket, 2);

  let targetUser = null;

  if (typeof payload.userid === 'number') {
    targetUser = findUser(
      server,
      {
        channel: socket.channel,
        userid: payload.userid,
      },
    );
  } else if (typeof payload.nick === 'string') {
    targetUser = findUser(
      server,
      {
        channel: socket.channel,
        nick: payload.nick,
      },
    );
  } else {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel,
    }, socket);
  }

  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel,
    }, socket);
  }

  if (typeof targetUser.wallet !== 'object' || typeof targetUser.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: `@${targetUser.nick} has not connected a wallet`,
      id: Errors.Global.INVALID_DATA,
      channel: socket.channel,
    }, socket);
  }

  server.send({
    cmd: 'info',
    text: `${socket.nick} requested your wallet address`,
    id: Info.Wallet.ADDRESS_REQUESTED,
    channel: socket.channel,
  }, targetUser);

  return server.reply({
    cmd: 'walletInfo',
    userid: targetUser.userid,
    nick: targetUser.nick,
    address: targetUser.wallet.address,
    channel: socket.channel,
  }, socket);
}

/**
  * The following payload properties are required to invoke this module:
  * "userid" OR "nick"
  * @public
  * @typedef {Array} getwallet/requiredData
  */
// export const requiredData = ['userid'];

/**
  * Module meta information
  * @public
  * @typedef {Object} getwallet/info
  * @property {string} name - Module command name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'getwallet',
  category: 'wallet',
  description: 'Retrieves the public wallet address of a specific user',
  usage: `
    API: { cmd: 'getwallet', userid: <target userid> }
    API: { cmd: 'getwallet', nick: <target nick> }`,
};
