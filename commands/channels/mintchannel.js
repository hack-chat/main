/* global fetch */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Mint Channel Ownership
  * @version 1.4.3
  * @description Gatekeeps channel claims, verifies PDA availability,
  * and fetches the mint transaction from the mint API
  * @module mintchannel
  */

import { PublicKey, Connection } from '@solana/web3.js';
import * as borsh from '@coral-xyz/borsh';
import { Errors, Info } from '../utility/_Constants.js';

const SMART_CONTRACT_PROGRAM_ID = new PublicKey('AutHysEUfKrWDETzrDA7S7MwL1eSSc2BjySR2W8EuSEr');
const MINT_API_DOMAIN = '<REMOVED>';
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// borsh layout for reading the active pda state
const channelStateLayout = borsh.struct([
  borsh.u8('discriminator'),
  borsh.str('channelName'),
  borsh.array(borsh.u8(), 32, 'ownerNftMint'),
  borsh.array(borsh.u8(), 32, 'ownerWallet'),
  borsh.vec(borsh.array(borsh.u8(), 6), 'moderatorTrips'),
  borsh.u8('bump'),
]);

// format address for display
const shortenAddress = (address) => `${address.slice(0, 5)}...${address.slice(-5)}`;

/**
  * Automatically executes once after server is ready or after a hot-reload
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // initialize solana connection
  if (typeof core.solanaConnection === 'undefined') {
    core.solanaConnection = new Connection(RPC_URL, 'confirmed');
  }
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

  // module currently disabled
  return server.reply({
    cmd: 'warn',
    text: 'mintchannel is disabled, likely until November 1st',
    // id: @todo
    channel: targetChannel,
  }, socket);

  // ensure wallet is connected
  if (typeof socket.wallet !== 'object' || typeof socket.wallet.address !== 'string') {
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
      channel: targetChannel,
    }, socket);
  }

  // derive pda for channel
  const [channelPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('channel'), Buffer.from(targetChannel)],
    SMART_CONTRACT_PROGRAM_ID,
  );

  try {
    // check if already claimed
    const pdaAccountInfo = await core.solanaConnection.getAccountInfo(channelPda);

    if (pdaAccountInfo !== null) {
      const decodedState = channelStateLayout.decode(pdaAccountInfo.data);
      const ownerWalletKey = new PublicKey(decodedState.ownerWallet).toBase58();

      return server.reply({
        cmd: 'warn',
        text: '?{channel} has already been claimed by [{short}](https://solscan.io/account/{owner})',
        id: Errors.ClaimChannel.ALREADY_OWNED,
        args: {
          channel: targetChannel,
          owner: ownerWalletKey,
          short: shortenAddress(ownerWalletKey),
        },
        channel: targetChannel,
      }, socket);
    }
  } catch (err) {
    console.log(`Network error checking PDA for ${targetChannel}:`, err.message);
    return server.reply({
      cmd: 'warn',
      text: 'RPC error, try again later',
      id: Errors.Wallet.RPC_ERROR,
      channel: targetChannel,
    }, socket);
  }

  // notify client of request
  server.reply({
    cmd: 'info',
    text: 'Requesting ownership. . .',
    id: Info.ChannelInfo.REQUESTING_OWNERSHIP,
    channel: targetChannel,
  }, socket);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // fetch mint transaction
    const apiResponse = await fetch(`https://${MINT_API_DOMAIN}/build-mint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: targetChannel,
        wallet: socket.wallet.address,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // handle failed requests
    if (!apiResponse.ok) {
      let errorMsg = 'build-mint failure';
      try {
        const errorData = await apiResponse.json();
        errorMsg = errorData.error || errorMsg;
      } catch (parseErr) {
        errorMsg = `HTTP ${apiResponse.status} Error`;
      }
      throw new Error(errorMsg);
    }

    const result = await apiResponse.json();

    // prompt client to sign
    return server.reply({
      cmd: 'signTransaction',
      tx: result.tx,
      from: false,
      type: 'NFT_MINT',
      imageUrl: result.imageUrl,
      channel: targetChannel,
    }, socket);
  } catch (err) {
    console.log(`Failed to mint ${targetChannel}:`, err.message);

    if (err.message.indexOf('name violates platform safety') !== -1) {
      return server.reply({
        cmd: 'warn',
        text: 'You may not do that',
        id: Errors.Global.PERMISSION,
        channel: targetChannel,
      }, socket);
    }

    return server.reply({
      cmd: 'warn',
      text: 'RPC error, try again later',
      id: Errors.Wallet.RPC_ERROR,
      channel: targetChannel,
    }, socket);
  }
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatHook.bind(this), 27);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/new payload, false = suppress, string = error
  */
export function chatHook({
  core, server, socket, payload,
}) {
  if (typeof payload === 'undefined' || typeof payload.text !== 'string') return false;

  // intercept slash command
  if (payload.text.startsWith('/mintchannel')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'mintchannel',
        channel: payload.channel,
      },
    });

    // suppress output
    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "channel"
  * @public
  * @typedef {Array} mintchannel/requiredData
  */
export const requiredData = ['channel'];

/**
  * Module meta information
  * @public
  * @typedef {Object} mintchannel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'mintchannel',
  category: 'wallet',
  description: 'Mints channel ownership to your wallet and claims owner rights',
  usage: `
    API: { cmd: 'mintchannel', channel: 'channelName' }
    Text: /mintchannel`,
};
