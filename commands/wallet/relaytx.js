/**
  * @author Marzavec
  * @summary Relay a transaction to another user for signing
  * @version 1.0.0
  * @description Accepts a base64 transaction and forwards it to a target user to sign
  * @module relaytx
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

  if (typeof socket.wallet !== 'object' || typeof socket.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: 'You must connect a wallet first',
      id: Errors.Global.LOGIN_REQUIRED,
      channel: socket.channel,
    }, socket);
  }

  if (typeof payload.tx !== 'string' || payload.tx.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Missing or invalid transaction data',
      id: Errors.Global.INVALID_DATA,
      channel: socket.channel,
    }, socket);
  }

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
      text: 'You must specify a target user by nick or userid',
      id: Errors.Global.INVALID_DATA,
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

  if (targetUser.userid === socket.userid) {
    return server.reply({
      cmd: 'warn',
      text: 'You cannot relay transactions to yourself',
      id: Errors.Global.INVALID_DATA,
      channel: socket.channel,
    }, socket);
  }

  if (typeof targetUser.wallet !== 'object' || typeof targetUser.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: `@${targetUser.nick} does not have a connected wallet`,
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel,
    }, socket);
  }

  server.reply({
    cmd: 'signTransaction',
    tx: payload.tx,
    type: '3RD_PARTY_TRANSFER',
    from: socket.nick,
    channel: socket.channel,
  }, targetUser);

  return server.reply({
    cmd: 'info',
    text: `TX sent to @${targetUser.nick}`,
    id: Info.Wallet.TX_RELAYED,
    channel: socket.channel,
  }, socket);
}

/**
  * The following payload properties are required to invoke this module:
  * "tx", and either "userid" or "nick"
  * @public
  * @typedef {Array} relaytx/requiredData
  */
export const requiredData = ['tx'];

/**
  * Module meta information
  * @public
  * @typedef {Object} relaytx/info
  * @property {string} name - Module command name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'relaytx',
  category: 'wallet',
  description: 'Relays a base64 transaction to a target user for signature',
  usage: `
    API: { cmd: 'relaytx', tx: <base64 string>, userid: <target userid> }
    API: { cmd: 'relaytx', tx: <base64 string>, nick: <target nick> }`,
};
