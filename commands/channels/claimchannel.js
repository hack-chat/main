/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Renew/Re-initialize a claimed channel
  * @version 1.0.0
  * @description Invokes the smart contract to renew or claim ownership of a channel
  * @module claimchannel
  */

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as borsh from '@coral-xyz/borsh';

import { Errors } from '../utility/_Constants.js';

const PROGRAM_ID = new PublicKey('AutHysEUfKrWDETzrDA7S7MwL1eSSc2BjySR2W8EuSEr');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

// borsh layout for hackchatinstruction::reclaimchannel (index 1, no data payload)
const reclaimChannelLayout = borsh.struct([
  borsh.u8('instruction'),
]);

// borsh layout for reading the active pda state
const channelStateLayout = borsh.struct([
  borsh.u8('discriminator'),
  borsh.str('channelName'),
  borsh.publicKey('ownerNftMint'),
  borsh.publicKey('ownerWallet'),
  borsh.vec(borsh.array(borsh.u8(), 6), 'moderatorTrips'),
  borsh.u8('bump'),
]);

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  const currentChannel = payload.channel;
  const targetChannel = payload.targetChannel || currentChannel;

  // validate wallet connection
  if (!socket.wallet || !socket.wallet.address) {
    return server.reply({
      cmd: 'warn',
      text: 'You must connect a wallet first',
      id: Errors.Wallet.YOUR_NOT_READY,
      channel: targetChannel,
    }, socket);
  }

  // validate channel length
  const channelByteLength = Buffer.byteLength(targetChannel, 'utf8');

  if (channelByteLength > 32 || channelByteLength === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid channel length (1-32 bytes allowed)',
      id: Errors.Channel.INVALID_NAME,
      channel: currentChannel,
    }, socket);
  }

  // derive channel pda
  const walletPubkey = new PublicKey(socket.wallet.address);
  const [channelPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('channel'), Buffer.from(targetChannel)],
    PROGRAM_ID,
  );

  let ownerNftMint = null;

  // fetch or parse channel owner mint
  try {
    const cachedData = core.chainCache?.channels?.[targetChannel]?.data;
    if (cachedData && cachedData.ownerNftMint) {
      ownerNftMint = cachedData.ownerNftMint;
    } else {
      const rpcResponse = await core.solanaRPC.getAccountInfo(
        channelPda.toBase58(),
        { encoding: 'base64' },
      ).send();

      const accountInfo = rpcResponse?.value;
      if (accountInfo && accountInfo.data) {
        const rawBuffer = Array.isArray(accountInfo.data)
          ? Buffer.from(accountInfo.data[0], 'base64')
          : Buffer.from(accountInfo.data);

        const accountData = channelStateLayout.decode(rawBuffer);
        ownerNftMint = accountData.ownerNftMint;

        if (core.chainCache && core.chainCache.channels) {
          core.chainCache.channels[targetChannel] = {
            data: accountData,
            timestamp: Date.now(),
          };
        }
      }
    }
  } catch (err) {
    console.error(`[ClaimChannel] Failed to fetch PDA for ?${targetChannel}:`, err);
  }

  // enforce mint requirement
  if (!ownerNftMint) {
    return server.reply({
      cmd: 'warn',
      text: `?${targetChannel} must be minted first, use: /mintchannel`,
      id: Errors.ClaimChannel.MUST_MINT,
      args: { channel: targetChannel },
      channel: currentChannel,
    }, socket);
  }

  // derive associated token account
  const [userTokenAccount] = PublicKey.findProgramAddressSync(
    [walletPubkey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), ownerNftMint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );

  try {
    const rpcResponse = await core.solanaRPC.getLatestBlockhash().send();
    const { blockhash } = rpcResponse.value;
    const dataBuffer = Buffer.alloc(1);
    const dataLen = reclaimChannelLayout.encode(
      { instruction: 1 },
      dataBuffer,
    );

    const txInstruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: channelPda, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: false },
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: dataBuffer.slice(0, dataLen),
    });

    const transaction = new Transaction();
    transaction.add(txInstruction);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    server.reply({
      cmd: 'info',
      text: 'Accept the following to claim ownership:',
      id: Errors.ClaimChannel.ACCEPT_CLAIM,
      channel: currentChannel,
    }, socket);

    // request user signature
    server.reply({
      cmd: 'signTransaction',
      tx: serializedTx,
      channel: currentChannel,
    }, socket);

    // schedule pda state refresh
    setTimeout(async () => {
      try {
        const fetchResponse = await core.solanaRPC.getAccountInfo(
          channelPda.toBase58(),
          { encoding: 'base64' },
        ).send();

        const accountInfo = fetchResponse?.value;
        if (accountInfo && accountInfo.data) {
          const rawBuffer = Array.isArray(accountInfo.data)
            ? Buffer.from(accountInfo.data[0], 'base64')
            : Buffer.from(accountInfo.data);

          const accountData = channelStateLayout.decode(rawBuffer);
          if (core.chainCache && core.chainCache.channels) {
            core.chainCache.channels[targetChannel] = {
              data: accountData,
              timestamp: Date.now(),
            };

            console.log(`Refreshed data for ?${targetChannel} after claim`);
          }
        }
      } catch (err) {
        if (core.chainCache?.channels?.[targetChannel]) {
          core.chainCache.channels[targetChannel].timestamp = 0;
        }
      }
    }, 105000);
  } catch (err) {
    console.error('Error generating claim tx:', err);
    return server.reply({
      cmd: 'warn',
      text: 'RPC error, try again later',
      id: Errors.Wallet.RPC_ERROR,
      channel: targetChannel,
    }, socket);
  }

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.claimchannelCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function claimchannelCheck({
  core, server, socket, payload,
}) {
  if (!payload || typeof payload.text !== 'string') {
    return false;
  }

  const currentChannel = payload.channel;

  // validate presence in channel
  if (!currentChannel || !socket.channels || !socket.channels.includes(currentChannel)) {
    return payload;
  }

  // intercept /claimchannel command
  if (payload.text.startsWith('/claimchannel')) {
    const input = payload.text.split(' ');
    const targetChannel = input[1] ? input[1].replace('?', '') : currentChannel;

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'claimchannel',
        targetChannel,
        channel: currentChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "targetChannel", "channel"
  * @public
  * @typedef {Array} claimchannel/requiredData
  */
export const requiredData = ['targetChannel', 'channel'];

/**
  * Module meta information
  * @public
  * @typedef {Object} claimchannel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'claimchannel',
  category: 'channels',
  description: 'Invoke the smart contract to claim or renew a channel',
  usage: `
    API: { cmd: 'claimchannel', targetChannel: '[optional channel name]', channel: '[current channel]' }
    Text: /claimchannel [optional channel name]`,
};
