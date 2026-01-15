/**
  * @author Marzavec
  * @summary Allow a Solana transfer
  * @version 1.0.0
  * @description Builds a transaction for a Solana transfer
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
  findUser,
} from '../utility/_Channels.js';
// import { Buffer } from 'buffer';

const RPC_URL = 'https://solana-rpc.parafi.tech';
const SERVER_WALLET = 'HACkoKCBiLiWjuVf4S4gTbFqJohVC6VkacBEBTtUCHat';

/**
  * Automatically executes once after server is ready or after a hot-reload
  * Ensures the shared Solana RPC client is initialized in the core environment
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  if (typeof core.solanaRPC === 'undefined') {
    core.solanaRPC = createSolanaRpc(RPC_URL);
  }
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 1);
  }

  server.police.frisk(socket, 8);

  // client must have a confirmed wallet
  if (typeof socket.wallet !== 'object' || typeof socket.wallet.address !== 'string') {
    return server.send({
      cmd: 'warn',
      text: 'You must connect a wallet first',
      id: Errors.Global.LOGIN_REQUIRED,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (typeof payload.amount !== 'number' || payload.amount <= 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid amount',
      id: Errors.Wallet.INVALID_AMOUNT,
      channel: socket.channel, // @todo Multichannel
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
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
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

  // target user must have a confirmed wallet
  if (typeof targetUser.wallet !== 'object' || typeof targetUser.wallet.address !== 'string') {
    return server.send({
      cmd: 'warn',
      text: `@${targetUser.nick} must connect a wallet first`,
      id: Errors.Global.LOGIN_REQUIRED,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  server.send({
    cmd: 'info',
    text: `${socket.nick} viewed your wallet`,
    id: Info.Wallet.VIEWED,
    channel: socket.channel, // @todo Multichannel
  }, targetUser);

  const senderPubkey = new PublicKey(socket.wallet.address);
  const recipientPubkey = new PublicKey(targetUser.wallet.address);
  const SERVER_ADDRESS = new PublicKey(SERVER_WALLET);

  const mainAmountLamports = Math.floor(payload.amount * LAMPORTS_PER_SOL);

  const feePercentage = 0.01;
  const feeAmountLamports = Math.floor(mainAmountLamports * feePercentage);

  if (mainAmountLamports < 1 || feeAmountLamports < 1) {
    return server.reply({
      cmd: 'warn',
      text: 'Transfer amount too low to cover required fees',
      id: Errors.Wallet.INVALID_AMOUNT,
      channel: socket.channel,
    }, socket);
  }

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

  const rpcResponse = await core.solanaRPC.getLatestBlockhash().send();
  const latestBlockhash = rpcResponse.value;

  if (!latestBlockhash || !latestBlockhash.blockhash) {
    return server.reply({
      cmd: 'warn',
      text: 'RPC error, try again later',
      id: Errors.Global.INTERNAL_ERROR,
      channel: socket.channel,
    }, socket);
  }

  transaction.feePayer = senderPubkey;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const base64Tx = serializedTx.toString('base64');

  return server.reply({
    cmd: 'signTransaction',
    tx: base64Tx,
    type: 'STANDARD_TRANSFER',
    from: false,
    channel: socket.channel,
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

  if (payload.text.startsWith('/sendsol ')) {
    const input = payload.text.split(' ');

    const nick = input[1];
    if (!nick || !nick.replace(/[^a-zA-Z0-9_]/g, '')) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to send sol: Missing name. Refer to `/help sendsol` for instructions on how to use this command.',
        id: Errors.Global.UNKNOWN_USER,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    const amount = Number(input[2]);
    if (!amount || Number.isNaN(amount)) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to send sol: Missing amount. Refer to `/help sendsol` for instructions on how to use this command.',
        id: Errors.Wallet.INVALID_AMOUNT,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'sendsol',
        nick: nick.replace(/[^a-zA-Z0-9_]/g, ''),
        amount,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "userid", "amount"
  * @public
  * @typedef {Array} sendsol/requiredData
  */
export const requiredData = ['userid', 'amount'];

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
    Text: /sendsol @nick 23`,
};
