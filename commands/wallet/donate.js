/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Donate SOL to the server and unlock a global chat effect
  * @version 1.2.1
  * @description Builds a transaction to invoke the RecordDonation
  * smart contract instruction with active cache polling
  * @module donate
  */

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as borsh from '@coral-xyz/borsh';
import { createSolanaRpc } from '@solana/kit';

import {
  Errors,
} from '../utility/_Constants.js';

import {
  getUserDetails,
} from '../utility/_UAC.js';

// rpc and core transaction settings
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const SERVER_WALLET = 'HaCKy1tUTBDkfUkcYcUFkhC887ucAs3tEjcmqRa5cHat';
const PROGRAM_ID = new PublicKey('AutHysEUfKrWDETzrDA7S7MwL1eSSc2BjySR2W8EuSEr');
const CACHE_TTL = 30000;

// define borsh schema for donation state
const donationStateLayout = borsh.struct([
  borsh.u8('discriminator'),
  borsh.u8('effect'),
]);

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
    console.error('Failed to fetch blockhash:', e);
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

  // validate donation amount
  if (typeof payload.amount !== 'number' || payload.amount <= 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid amount',
      id: Errors.Wallet.INVALID_AMOUNT,
      channel: targetChannel,
    }, socket);
  }

  // pick random effect if invalid
  let effectId = payload.effect;
  if (typeof effectId !== 'number' || effectId < 1 || effectId > 20) {
    effectId = Math.floor(Math.random() * 20) + 1;
  }

  const senderPubkey = new PublicKey(socket.wallet.address);
  const serverPubkey = new PublicKey(SERVER_WALLET);

  const mainAmountLamports = Math.floor(payload.amount * LAMPORTS_PER_SOL);

  if (mainAmountLamports < 1) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid amount',
      id: Errors.Wallet.INVALID_AMOUNT,
      channel: targetChannel,
    }, socket);
  }

  // derive donation pda
  const [donationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('donation'), senderPubkey.toBuffer()],
    PROGRAM_ID,
  );

  // build the solana transaction
  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
  );

  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
  );

  // write instruction data
  const dataBuffer = Buffer.alloc(10);
  dataBuffer.writeUInt8(5, 0);
  dataBuffer.writeUInt8(effectId, 1);
  dataBuffer.writeBigUInt64LE(BigInt(mainAmountLamports), 2);

  const recordDonationIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: senderPubkey, isSigner: true, isWritable: true },
      { pubkey: serverPubkey, isSigner: false, isWritable: true },
      { pubkey: donationPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: dataBuffer,
  });

  transaction.add(recordDonationIx);

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
  server.reply({
    cmd: 'signTransaction',
    tx: base64Tx,
    type: 'DONATION',
    from: false,
    channel: targetChannel,
  }, socket);

  // schedule cache refresh
  setTimeout(async () => {
    try {
      const fetchResponse = await core.solanaRPC.getAccountInfo(
        donationPda.toBase58(),
        { encoding: 'base64' },
      ).send();

      const accountInfo = fetchResponse?.value;

      if (accountInfo && accountInfo.data) {
        const rawBuffer = Array.isArray(accountInfo.data)
          ? Buffer.from(accountInfo.data[0], 'base64')
          : Buffer.from(accountInfo.data);

        const accountData = donationStateLayout.decode(rawBuffer);

        if (core.chainCache && core.chainCache.donations) {
          core.chainCache.donations[senderPubkey.toBase58()] = {
            effect: accountData.effect,
            timestamp: Date.now(),
          };

          if (socket && socket.channels) {
            socket.effect = accountData.effect;

            for (let i = 0; i < socket.channels.length; i += 1) {
              const currentChannel = socket.channels[i];

              const outgoingPayload = {
                ...getUserDetails(socket, currentChannel),
                effect: socket.effect,
                cmd: 'updateUser',
                channel: currentChannel,
              };

              server.broadcast(outgoingPayload, (client) => {
                if (client.channels && client.channels.includes(currentChannel)) {
                  return true;
                }
                return false;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(`Refresh failed for donation PDA ${donationPda.toBase58()}:`, err);

      // invalidate cache on failure
      if (core.chainCache?.donations?.[senderPubkey.toBase58()]) {
        core.chainCache.donations[senderPubkey.toBase58()].timestamp = 0;
      }
    }
  }, 105000);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runDonateCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function runDonateCheck({
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

  // intercept /donate chat command
  if (payload.text.startsWith('/donate ')) {
    const input = payload.text.split(' ');

    const amount = Number(input[1]);
    if (!amount || Number.isNaN(amount)) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid amount',
        id: Errors.Wallet.INVALID_AMOUNT,
        channel: targetChannel,
      }, socket);

      return false;
    }

    const effect = input[2] ? Number(input[2]) : null;

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'donate',
        amount,
        effect: !Number.isNaN(effect) ? effect : null,
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
  * @typedef {Array} donate/requiredData
  */
export const requiredData = ['amount'];

/**
  * Module meta information
  * @public
  * @typedef {Object} donate/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'donate',
  category: 'wallet',
  description: 'Constructs a Solana transaction to donate to the server and unlock a username effect',
  usage: `
    API: { cmd: 'donate', amount: <numeric amount in sol>, effect: <optional 1-20> }
    Text: /donate 0.5
    Text: /donate 1.0 15`,
};
