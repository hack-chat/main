/**
  * @author Marzavec ( https://github.com/marzavec )
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

  // ensure target has a connected wallet
  if (typeof targetUser.wallet !== 'object' || typeof targetUser.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: `@${targetUser.nick} has not connected a wallet`,
      id: Errors.Wallet.USER_NOT_READY,
      args: { nick: targetUser.nick },
      channel: targetChannel,
    }, socket);
  }

  // alert target user of the query
  server.send({
    cmd: 'info',
    text: `${socket.nick} requested your wallet address`,
    id: Info.Wallet.ADDRESS_REQUESTED,
    args: { nick: socket.nick },
    channel: targetChannel,
  }, targetUser);

  // return wallet address to requester
  return server.reply({
    cmd: 'walletInfo',
    userid: targetUser.userid,
    nick: targetUser.nick,
    address: targetUser.wallet.address,
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
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /getwallet
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept wallet chat commands
  if (payload.text.startsWith('/getwallet ') || payload.text.startsWith('/wallet ')) {
    const input = payload.text.split(' ');

    // missing target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help getwallet` for instructions on how to use this command',
        id: Errors.Wallet.CMD_HELP,
        channel: targetChannel,
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'getwallet',
        nick: target,
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
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
    API: { cmd: 'getwallet', nick: <target nick> }
    Text: /getwallet <target nick>
    Text: /wallet <target nick>`,
};
