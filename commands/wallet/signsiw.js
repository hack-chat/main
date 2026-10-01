/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Finalize a siw
  * @version 1.0.2
  * @description Finalize a siw, check for ownership, sync permissions,
  * load effects, and manage RPC caching
  * @module signsiw
  */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import * as borsh from '@coral-xyz/borsh';
import { createSolanaRpc } from '@solana/kit';

import {
  levels,
  getUserDetails,
  getUserLevel,
} from '../utility/_UAC.js';

import {
  getChannelSettings,
} from '../utility/_Channels.js';

import {
  Errors,
  Info,
} from '../utility/_Constants.js';

// rpc connection settings
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const PROGRAM_ID = new PublicKey('AutHysEUfKrWDETzrDA7S7MwL1eSSc2BjySR2W8EuSEr');
const CACHE_TTL = 30000;

// define borsh schema for channel state
const channelStateLayout = borsh.struct([
  borsh.u8('discriminator'),
  borsh.str('channelName'),
  borsh.publicKey('ownerNftMint'),
  borsh.publicKey('ownerWallet'),
  borsh.vec(borsh.array(borsh.u8(), 6), 'moderatorTrips'),
  borsh.u8('bump'),
]);

// shortens a wallet address for display
const shortenAddress = (address) => `${address.slice(0, 5)}...${address.slice(-5)}`;

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
  * Fetches both the Channel PDA and Donation PDA using a CACHE_TTL memory cache
  * @param {string} channelName - The name of the channel
  * @param {string} walletAddress - The user's verified wallet address
  * @param {string} userTrip - The user's current trip code
  * @param {Object} core - Core environment
  * @returns {Promise<Object>} - { newLevel: number|null, effect: number }
  */
async function checkChainState(channelName, walletAddress, userTrip, core) {
  let newLevel = null;
  let effect = 0;
  const now = Date.now();

  try {
    const userPubkey = new PublicKey(walletAddress);

    let channelCache = core.chainCache.channels[channelName];
    let donationCache = core.chainCache.donations[walletAddress];

    // check cache expiration
    const needsChannel = !channelCache || (now - channelCache.timestamp > CACHE_TTL);
    const needsDonation = !donationCache || (now - donationCache.timestamp > CACHE_TTL);

    const accountsToFetch = [];

    // derive channel pda
    if (needsChannel) {
      const [channelPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), Buffer.from(channelName)],
        PROGRAM_ID,
      );
      accountsToFetch.push(channelPda.toBase58());
    }

    // derive donation pda
    if (needsDonation) {
      const [donationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('donation'), userPubkey.toBuffer()],
        PROGRAM_ID,
      );
      accountsToFetch.push(donationPda.toBase58());
    }

    // fetch accounts from rpc
    if (accountsToFetch.length > 0) {
      const rpcResponse = await core.solanaRPC.getMultipleAccounts(
        accountsToFetch,
        { encoding: 'base64' },
      ).send();

      const accounts = rpcResponse?.value || [];
      let accountIndex = 0;

      // parse channel data
      if (needsChannel) {
        const info = accounts[accountIndex];
        accountIndex += 1;
        let accountData = null;
        if (info && info.data) {
          const { data } = info;
          const rawBuffer = Array.isArray(data)
            ? Buffer.from(data[0], 'base64')
            : Buffer.from(data);
          accountData = channelStateLayout.decode(rawBuffer);
        }
        core.chainCache.channels[channelName] = { data: accountData, timestamp: now };
        channelCache = core.chainCache.channels[channelName];
      }

      // parse donation data
      if (needsDonation) {
        const info = accounts[accountIndex];
        accountIndex += 1;
        let eff = 0;
        if (info && info.data) {
          const { data } = info;
          const rawDonationData = Array.isArray(data)
            ? Buffer.from(data[0], 'base64')
            : Buffer.from(data);

          if (rawDonationData.length >= 2) {
            const [discriminator, donationEffect] = rawDonationData;
            if (discriminator === 2) {
              eff = donationEffect;
            }
          }
        }
        core.chainCache.donations[walletAddress] = { effect: eff, timestamp: now };
        donationCache = core.chainCache.donations[walletAddress];
      }
    }

    effect = donationCache.effect;
    const accountData = channelCache.data;

    // apply levels based on pda state
    if (accountData) {
      if (accountData.ownerWallet.toBase58() === walletAddress) {
        newLevel = levels.channelOwner;
      } else if (userTrip && accountData.moderatorTrips) {
        const tripBuffer = Buffer.from(userTrip);
        const isMod = accountData.moderatorTrips.some(
          (modTripBytes) => Buffer.from(modTripBytes).equals(tripBuffer),
        );

        if (isMod) {
          newLevel = levels.channelModerator;
        }
      }
    }

    return { newLevel, effect };
  } catch (err) {
    console.error('Error fetching chain state:', err);
    return { newLevel, effect };
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
  const targetChannel = payload.channel || (socket.channels && socket.channels[0]);

  // verify socket is in a channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not do that',
      id: Errors.Global.PERMISSION,
      channel: false,
    }, socket);
  }

  // ensure siw process was started
  if (typeof socket.siwMsg === 'undefined' || typeof socket.siwAddress === 'undefined') {
    return false;
  }

  // validate signature payload
  if (typeof payload.signature !== 'string' || typeof payload.signedMessage !== 'string') {
    return false;
  }

  if (payload.signedMessage !== socket.siwMsg) {
    return false;
  }

  // check expiration
  const now = new Date();
  if (!socket.siwExpiry || socket.siwExpiry < now) {
    return false;
  }

  const tempSiwAddress = socket.siwAddress;

  // clean up siw session variables
  socket.siwMsg = undefined;
  socket.siwAddress = undefined;
  socket.siwExpiry = undefined;

  const messageBytes = new TextEncoder().encode(payload.signedMessage);
  const publicKeyBytes = bs58.decode(tempSiwAddress);
  const signatureBytes = bs58.decode(payload.signature);

  let isVerified = false;
  try {
    // verify the cryptographic signature
    isVerified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );
  } catch {
    return false;
  }

  if (isVerified) {
    // assign wallet to socket
    socket.wallet = {};
    socket.wallet.address = tempSiwAddress;

    const baseReplyText = `Now connected to: ${shortenAddress(tempSiwAddress)}`;
    let targetChannelReplyText = baseReplyText;
    let newLevel = null;
    const oldEffect = socket.effect || 0;

    // fetch current channel settings and chain state
    const channelSettings = getChannelSettings(core.appConfig.data, targetChannel);
    const chainState = await checkChainState(
      targetChannel,
      tempSiwAddress,
      socket.trip,
      core,
    );

    socket.effect = chainState.effect;

    if (chainState.newLevel !== null) {
      newLevel = chainState.newLevel;
    } else if (!channelSettings.owned) {
      newLevel = null;
    }

    const currentLevel = getUserLevel(socket, targetChannel);
    let levelChanged = false;

    // determine level changes
    if (newLevel !== null && newLevel > currentLevel) {
      levelChanged = true;
      if (!socket.channelStates) {
        socket.channelStates = {};
      }

      if (!socket.channelStates[targetChannel]) {
        socket.channelStates[targetChannel] = {
          level: currentLevel,
          trip: socket.trip,
        };
      }

      socket.channelStates[targetChannel].level = newLevel;

      if (newLevel === levels.channelOwner) {
        targetChannelReplyText += ' You are the verified owner of this channel';
      } else if (newLevel === levels.channelModerator) {
        targetChannelReplyText += ' You are a verified moderator of this channel';
      }
    }

    // broadcast updates if needed
    if (socket.channels) {
      for (let i = 0; i < socket.channels.length; i += 1) {
        const currentChannel = socket.channels[i];
        const channelLevelChanged = (currentChannel === targetChannel) ? levelChanged : false;

        if (oldEffect !== socket.effect || channelLevelChanged) {
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

        server.reply({
          cmd: 'info',
          text: currentChannel === targetChannel ? targetChannelReplyText : baseReplyText,
          id: Info.Wallet.CONNECTED,
          args: { address: `${shortenAddress(tempSiwAddress)}` },
          channel: currentChannel,
        }, socket);
      }
    }

    return true;
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
  description: 'Verifies the wallet signature, syncs on-chain channel permissions and applies effects',
  usage: `
    API: { cmd: 'signsiw', signature: '<base58 signature>', signedMessage: '<original text>' }`,
};
