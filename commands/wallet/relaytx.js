/**
  * @author Marzavec ( https://github.com/marzavec )
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
  if (server.police.frisk(socket, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // socket must have a confirmed wallet
  if (typeof socket.wallet !== 'object' || typeof socket.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: 'You must connect a wallet first',
      id: Errors.Wallet.YOUR_NOT_READY,
      channel: targetChannel,
    }, socket);
  }

  // validate transaction payload
  if (typeof payload.tx !== 'string' || payload.tx.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Missing or invalid transaction data',
      id: Errors.Wallet.BAD_TX,
      channel: targetChannel,
    }, socket);
  }

  let targetUser = null;

  // find target user by id or nick
  if (typeof payload.userid === 'number') {
    targetUser = findUser(
      server,
      {
        channel: targetChannel,
        userid: payload.userid,
      },
    );
  } else if (typeof payload.nick === 'string') {
    targetUser = findUser(
      server,
      {
        channel: targetChannel,
        nick: payload.nick,
      },
    );
  } else {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  // prevent self-transfers
  if (targetUser.userid === socket.userid) {
    return server.reply({
      cmd: 'warn',
      text: 'You cannot relay transactions to yourself',
      id: Errors.Wallet.NO_SELF,
      channel: targetChannel,
    }, socket);
  }

  // target user must have a confirmed wallet
  if (typeof targetUser.wallet !== 'object' || typeof targetUser.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: `@${targetUser.nick} has not connected a wallet`,
      id: Errors.Wallet.USER_NOT_READY,
      args: { nick: targetUser.nick },
      channel: targetChannel,
    }, socket);
  }

  // forward transaction to target user
  server.reply({
    cmd: 'signTransaction',
    tx: payload.tx,
    type: '3RD_PARTY_TRANSFER',
    from: socket.nick,
    channel: targetChannel,
  }, targetUser);

  // notify sender of success
  return server.reply({
    cmd: 'info',
    text: `TX sent to @${targetUser.nick}`,
    id: Info.Wallet.TX_RELAYED,
    args: { nick: targetUser.nick },
    channel: targetChannel,
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
