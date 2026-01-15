/**
  * @author Marzavec
  * @summary Finalize a siw
  * @version 1.0.0
  * @description Finalize a siw, check for NFT ownership, and sync permissions
  * @module signsiw
  */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { BorshCoder } from '@coral-xyz/anchor';
import { createSolanaRpc } from '@solana/kit';

import {
  levels,
  getAppearance,
  getUserDetails,
} from '../utility/_UAC.js';

import {
  getChannelSettings,
} from '../utility/_Channels.js';

import {
  Info,
} from '../utility/_Constants.js';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('HACkoKCBiLiWjuVf4S4gTbFqJohVC6VkacBEBTtUCHat'); // @todo
const IDL = {
  address: 'HACkoKCBiLiWjuVf4S4gTbFqJohVC6VkacBEBTtUCHat', // @todo
  metadata: { name: 'hackchat_sc', version: '0.1.0', spec: '0.1.0' },
  accounts: [
    {
      name: 'ChannelState',
      discriminator: [74, 132, 141, 196, 64, 52, 83, 136],
    },
  ],
  types: [
    {
      name: 'ChannelState',
      type: {
        kind: 'struct',
        fields: [
          { name: 'channel_name', type: 'string' },
          { name: 'owner_nft_mint', type: 'pubkey' },
          { name: 'owner_wallet', type: 'pubkey' },
          { name: 'moderator_trips', type: { vec: { array: ['u8', 6] } } },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
};

/**
  * Automatically executes once after server is ready or after a hot-reload
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  if (typeof core.solanaRPC === 'undefined') {
    core.solanaRPC = createSolanaRpc(RPC_URL);
  }

  // core.hackchatCoder = new BorshCoder(IDL);
}

/**
  * Checks Blockchain PDA for permissions
  * @param {string} channelName - The name of the channel (e.g., "general")
  * @param {string} walletAddress - The user's verified wallet address
  * @param {string} userTrip - The user's current trip code (if any)
  * @param {Object} core - Core environment (for RPC and Coder)
  * @returns {Promise<number|null>} - Returns the new level (number) or null if no perms found
  */
async function checkChainPermissions(channelName, walletAddress, userTrip, core) {
  try {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('channel'), Buffer.from(channelName)],
      PROGRAM_ID,
    );

    const accountInfo = await core.solanaRPC.getAccountInfo(pda);

    if (!accountInfo) {
      return null;
    }

    const accountData = core.hackchatCoder.accounts.decode(
      'ChannelState',
      accountInfo.data,
    );

    if (accountData.ownerWallet.toString() === walletAddress) {
      return levels.channelOwner;
    }

    if (userTrip && accountData.moderatorTrips) {
      const tripBuffer = Buffer.from(userTrip);

      const isMod = accountData.moderatorTrips.some((modTripBytes) => {
        const modTripBuffer = Buffer.from(modTripBytes);
        return modTripBuffer.equals(tripBuffer);
      });

      if (isMod) {
        return levels.channelModerator;
      }
    }

    return null;
  } catch (err) {
    console.error('Error checking chain permissions:', err);
    return null;
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

  if (typeof socket.siwMsg === 'undefined' || typeof socket.siwAddress === 'undefined') {
    return false;
  }

  if (typeof payload.signature !== 'string' || typeof payload.signedMessage !== 'string') {
    return false;
  }

  if (payload.signedMessage !== socket.siwMsg) {
    return false;
  }

  const now = new Date();
  if (!socket.siwExpiry || socket.siwExpiry < now) {
    return false;
  }

  const tempSiwAddress = socket.siwAddress;

  socket.siwMsg = undefined;
  socket.siwAddress = undefined;
  socket.siwExpiry = undefined;

  const messageBytes = new TextEncoder().encode(payload.signedMessage);
  const publicKeyBytes = bs58.decode(tempSiwAddress);
  const signatureBytes = bs58.decode(payload.signature);

  let isVerified = false;
  try {
    isVerified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );
  } catch (e) {
    return false;
  }

  if (isVerified) {
    socket.wallet = {};
    socket.wallet.address = tempSiwAddress;

    let replyText = `Now connected to: ${tempSiwAddress}`;

    const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

    let newLevel = null;

    if (!channelSettings.owned) {
      /* newLevel = await checkChainPermissions(
        socket.channel,
        tempSiwAddress,
        socket.trip,
        core,
      ); */
    }

    // only update if the new level is higher than what they currently have
    if (newLevel !== null && newLevel > socket.level) {
      socket.level = newLevel;

      const { color, flair } = getAppearance(newLevel);
      socket.color = color;
      socket.flair = flair;

      server.broadcast({
        ...getUserDetails(socket),
        ...{
          cmd: 'updateUser',
          channel: socket.channel,
        },
      }, { channel: socket.channel });

      if (newLevel === levels.channelOwner) {
        replyText += ' You are the verified owner of this channel';
      } else if (newLevel === levels.channelModerator) {
        replyText += ' You are a verified moderator of this channel';
      }
    }

    return server.reply({
      cmd: 'info',
      text: replyText,
      id: Info.Wallet.CONNECTED,
      channel: socket.channel,
    }, socket);
  }

  return false;
}

/**
  * The following payload properties are required to invoke this module:
  * "signature", "signedMessage"
  * @public
  * @typedef {Array} signsiw/requiredData
  */
export const requiredData = ['signature', 'signedMessage'];

/**
  * Module meta information
  * @public
  * @typedef {Object} signsiw/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'signsiw',
  category: 'wallet',
  description: 'Verifies the wallet signature and syncs on-chain channel permissions',
  usage: `
    API: { cmd: 'signsiw', signature: '<base58 signature>', signedMessage: '<original text>' }`,
};
