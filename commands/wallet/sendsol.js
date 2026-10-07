/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Allow a Solana transfer
  * @version 1.1.0
  * @description Builds a transaction for a Solana transfer with a blockhash cache
  * @module sendsol
  */

import {
  PublicKey,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { createSolanaRpc } from '@solana/kit';

import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  findUsers,
} from '../utility/_Channels.js';

// rpc and core transaction settings
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const SERVER_WALLET = 'HaCKy1tUTBDkfUkcYcUFkhC887ucAs3tEjcmqRa5cHat';
const CACHE_TTL = 30000;

/**
  * Automatically executes once after server is ready or after a hot-reload
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // initialize rpc client
  if (typeof core.solanaRPC === 'undefined') {
    core.solanaRPC = createSolanaRpc(RPC_URL);
  }

  // initialize chain cache
  if (typeof core.chainCache === 'undefined') {
    core.chainCache = {
      channels: {},
      donations: {},
      blockhash: {
        hash: null,
        timestamp: 0,
      },
    };
  }
}

/**
  * Internal helper to fetch and cache the latest blockhash
  * @param {Object} core - Reference to core environment object
  * @returns {Promise<string|null>}
  */
async function getCachedBlockhash(core) {
  const now = Date.now();

  // return cached blockhash if valid
  if (core.chainCache.blockhash.hash && (now - core.chainCache.blockhash.timestamp < CACHE_TTL)) {
    return core.chainCache.blockhash.hash;
  }

  try {
    // fetch latest blockhash from rpc
    const rpcResponse = await core.solanaRPC.getLatestBlockhash().send();
    const latestBlockhash = rpcResponse.value;

    if (latestBlockhash && latestBlockhash.blockhash) {
      core.chainCache.blockhash = {
        hash: latestBlockhash.blockhash,
        timestamp: now,
      };
      return latestBlockhash.blockhash;
    }
  } catch (e) {
    console.log('Failed to fetch blockhash:', e);
  }

  return null;
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 1);
  }

  // enforce rate limits
  if (server.police.frisk(socket, 8)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // client must have a confirmed wallet
  if (typeof socket.wallet !== 'object' || typeof socket.wallet.address !== 'string') {
    return server.send({
      cmd: 'warn',
      text: 'You must connect a wallet first',
      id: Errors.Wallet.YOUR_NOT_READY,
      channel: targetChannel,
    }, socket);
  }

  // validate transfer amount
  if (typeof payload.amount !== 'number' || payload.amount <= 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid amount',
      id: Errors.Wallet.INVALID_AMOUNT,
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

  // prevent self-transfers
  if (primaryTarget.userid === socket.userid) {
    return server.reply({
      cmd: 'warn',
      text: 'You cannot relay transactions to yourself',
      id: Errors.Wallet.NO_SELF,
      channel: targetChannel,
    }, socket);
  }

  // target user must have a confirmed wallet
  if (typeof primaryTarget.wallet !== 'object' || typeof primaryTarget.wallet.address !== 'string') {
    return server.send({
      cmd: 'warn',
      text: `@${primaryTarget.nick} has not connected a wallet`,
      id: Errors.Wallet.USER_NOT_READY,
      args: { nick: primaryTarget.nick },
      channel: targetChannel,
    }, socket);
  }

  // notify the target user's connections
  targetUsers.forEach((targetUser) => {
    server.send({
      cmd: 'info',
      text: `${socket.nick} viewed your wallet`,
      id: Info.Wallet.VIEWED,
      args: { nick: socket.nick },
      channel: targetChannel,
    }, targetUser);
  });

  // setup public keys
  const senderPubkey = new PublicKey(socket.wallet.address);
  const recipientPubkey = new PublicKey(primaryTarget.wallet.address);
  const SERVER_ADDRESS = new PublicKey(SERVER_WALLET);

  // calculate transfer amounts and fees
  const mainAmountLamports = Math.floor(payload.amount * LAMPORTS_PER_SOL);

  const feePercentage = 0.01;
  const feeAmountLamports = Math.floor(mainAmountLamports * feePercentage);

  if (mainAmountLamports < 1 || feeAmountLamports < 1) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid amount',
      id: Errors.Wallet.INVALID_AMOUNT,
      channel: targetChannel,
    }, socket);
  }

  // build the solana transaction
  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
  );

  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
  );

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports: mainAmountLamports,
    }),
  );

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: SERVER_ADDRESS,
      lamports: feeAmountLamports,
    }),
  );

  const latestBlockhash = await getCachedBlockhash(core);

  if (!latestBlockhash) {
    return server.reply({
      cmd: 'warn',
      text: 'RPC error, try again later',
      id: Errors.Wallet.RPC_ERROR,
      channel: targetChannel,
    }, socket);
  }

  transaction.feePayer = senderPubkey;
  transaction.recentBlockhash = latestBlockhash;

  // serialize transaction
  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const base64Tx = serializedTx.toString('base64');

  // dispatch signature request back to client
  return server.reply({
    cmd: 'signTransaction',
    tx: base64Tx,
    type: 'STANDARD_TRANSFER',
    from: false,
    channel: targetChannel,
  }, socket);
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runSendSolCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function runSendSolCheck({
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

  // intercept /sendsol chat command
  if (payload.text.startsWith('/sendsol ')) {
    const input = payload.text.split(' ');
    const nick = input[1];

    if (!nick || !nick.replace(/[^a-zA-Z0-9_]/g, '')) {
      server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
        id: Errors.Global.UNKNOWN_USER,
        channel: targetChannel,
      }, socket);

      return false;
    }

    const amount = Number(input[2]);
    if (!amount || Number.isNaN(amount)) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid amount',
        id: Errors.Wallet.INVALID_AMOUNT,
        channel: targetChannel,
      }, socket);

      return false;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'sendsol',
        nick: nick.replace(/[^a-zA-Z0-9_]/g, ''),
        amount,
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "amount"
  * @public
  * @typedef {Array} sendsol/requiredData
  */
export const requiredData = ['amount'];

/**
  * Module meta information
  * @public
  * @typedef {Object} sendsol/info
  * @property {string} name - Module command name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'sendsol',
  category: 'wallet',
  description: 'Constructs a Solana transaction to send funds to another user',
  usage: `
    API: { cmd: 'sendsol', userid: <target userid>, amount: <numeric amount in sol> }
    API: { cmd: 'sendsol', nick: <target nick>, amount: <numeric amount in sol> }
    Text: /sendsol @nick 23`,
};
