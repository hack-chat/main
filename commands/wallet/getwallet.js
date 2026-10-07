/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Retrieve a user's wallet address
  * @version 1.1.1
  * @description Checks if a target user has a connected wallet and returns the address
  * @module getwallet
  */

import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  findUsers,
} from '../utility/_Channels.js';

// format address for display
const shortenAddress = (address) => `${address.slice(0, 5)}...${address.slice(-5)}`;

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

  // warn on missing parameters
  if (typeof payload.userid !== 'number' && typeof payload.nick !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  // find target users
  const targetUsers = findUsers(server, { ...payload, channel: targetChannel });

  if (targetUsers.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  const primaryTarget = targetUsers[0];

  // ensure target has a connected wallet
  if (typeof primaryTarget.wallet !== 'object' || typeof primaryTarget.wallet.address !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: `@${primaryTarget.nick} has not connected a wallet`,
      id: Errors.Wallet.USER_NOT_READY,
      args: { nick: primaryTarget.nick },
      channel: targetChannel,
    }, socket);
  }

  // alert target user of the query
  targetUsers.forEach((targetUser) => {
    server.send({
      cmd: 'info',
      text: `${socket.nick} requested your wallet address`,
      id: Info.Wallet.ADDRESS_REQUESTED,
      args: { nick: socket.nick },
      channel: targetChannel,
    }, targetUser);
  });

  // if invoked via chat command, send a formatted text response via 'info' event
  if (payload.isChat) {
    return server.reply({
      cmd: 'info',
      text: `💳  **${primaryTarget.nick}**: [${shortenAddress(primaryTarget.wallet.address)}](https://solscan.io/account/${primaryTarget.wallet.address})`,
      channel: targetChannel,
    }, socket);
  }

  // standard api response
  return server.reply({
    cmd: 'walletInfo',
    userid: primaryTarget.userid,
    nick: primaryTarget.nick,
    address: primaryTarget.wallet.address,
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

    // trigger isChat run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'getwallet',
        nick: target,
        channel: targetChannel,
        isChat: true,
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
