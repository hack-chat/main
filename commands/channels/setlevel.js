/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Change user level
  * @version 1.2.1
  * @description Alter the permission level a trip is allowed within current channel.
  * @module setlevel
  */

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import * as borsh from '@coral-xyz/borsh';
import {
  levels,
  isChannelModerator,
  getUserDetails,
  getUserLevel,
} from '../utility/_UAC.js';
import { Errors, Info } from '../utility/_Constants.js';
import { getSession } from '../core/session.js';

const PROGRAM_ID = new PublicKey('AutHysEUfKrWDETzrDA7S7MwL1eSSc2BjySR2W8EuSEr');

// borsh layout for hackchatinstruction::assignmoderator (2) and removemoderator (3)
const modTripLayout = borsh.struct([
  borsh.u8('instruction'),
  borsh.str('tripCode'),
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
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // map available level keys
  core.levelLabels = Object.keys(levels);
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
    return server.police.frisk(socket, 10);
  }

  const requestLevel = getUserLevel(socket, targetChannel);

  // increase rate limit chance and ignore if not channel mod or better
  if (!isChannelModerator(requestLevel)) {
    return server.police.frisk(socket, 10);
  }

  const validTripRegex = /^[a-zA-Z0-9/+=]{6}$/;

  // validate trip parameter format
  if (
    typeof payload.trip !== 'string'
    || !validTripRegex.test(payload.trip)
    || Buffer.byteLength(payload.trip, 'utf8') !== 6
  ) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to set level: Invalid trip. Refer to `/help setlevel` for instructions on how to use this command.',
      id: Errors.SetLevel.BAD_TRIP,
      channel: targetChannel,
    }, socket);
  }

  // validate level parameter
  if (typeof payload.level !== 'string' || core.levelLabels.indexOf(payload.level) === -1) {
    const validLabels = core.levelLabels.join(', ');
    return server.reply({
      cmd: 'warn',
      text: `Failed to set level: Invalid level label; choices are case sensitive: ${validLabels}`,
      id: Errors.SetLevel.BAD_LABEL,
      args: { validLabels },
      channel: targetChannel,
    }, socket);
  }

  const newLevel = levels[payload.level];

  // prevent modifying users equal to or higher than caller
  if (newLevel >= requestLevel) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to set level: New level may not be the same or greater than your own',
      id: Errors.SetLevel.LEVEL_CONFLICT,
      channel: targetChannel,
    }, socket);
  }

  // protect channel owner status
  if (newLevel === levels.channelOwner) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to set level: Channel Owner status is strictly tied to ownership and can only be managed via the Solana blockchain',
      id: Errors.SetLevel.BAD_LEVEL,
      channel: targetChannel,
    }, socket);
  }

  let isWeb3Update = false;
  let web3Instruction = 0;

  // evaluate on-chain moderator status updates
  if (requestLevel === levels.channelOwner) {
    const chainData = core.chainCache?.channels?.[targetChannel]?.data;
    const tripBuffer = Buffer.from(payload.trip);

    const isCurrentlyWeb3Mod = chainData?.moderatorTrips?.some(
      (t) => Buffer.from(t).equals(tripBuffer),
    );

    if (newLevel === levels.channelModerator && !isCurrentlyWeb3Mod) {
      isWeb3Update = true;
      web3Instruction = 2; // assignmoderator
    } else if (isCurrentlyWeb3Mod && newLevel < levels.channelModerator) {
      isWeb3Update = true;
      web3Instruction = 3; // removemoderator
    }
  }

  if (isWeb3Update) {
    if (!socket.wallet || !socket.wallet.address) {
      return server.reply({
        cmd: 'warn',
        text: 'You must connect a wallet first',
        id: Errors.Wallet.YOUR_NOT_READY,
        channel: targetChannel,
      }, socket);
    }

    try {
      const rpcResponse = await core.solanaRPC.getLatestBlockhash().send();
      const { blockhash } = rpcResponse.value;

      const walletPubkey = new PublicKey(socket.wallet.address);
      const [channelPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), Buffer.from(targetChannel)],
        PROGRAM_ID,
      );

      const dataBuffer = Buffer.alloc(100);
      const dataLen = modTripLayout.encode(
        { instruction: web3Instruction, tripCode: payload.trip },
        dataBuffer,
      );

      const txInstruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: channelPda, isSigner: false, isWritable: true },
          { pubkey: walletPubkey, isSigner: true, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
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
        text: 'Accept the following to make it permanent:',
        id: Info.ChannelInfo.ACCEPT_CHANGES,
        channel: targetChannel,
      }, socket);

      server.reply({
        cmd: 'signTransaction',
        tx: serializedTx,
        channel: targetChannel,
      }, socket);

      // set timeout to fetch updated pda state
      setTimeout(async () => {
        try {
          const fetchResponse = await core.solanaRPC.getAccountInfo(
            channelPda.toBase58(),
            { encoding: 'base64' },
          ).send();

          const accountInfo = fetchResponse?.value;
          let accountData = null;

          if (accountInfo && accountInfo.data) {
            const rawBuffer = Array.isArray(accountInfo.data)
              ? Buffer.from(accountInfo.data[0], 'base64')
              : Buffer.from(accountInfo.data);

            accountData = channelStateLayout.decode(rawBuffer);
          }

          if (core.chainCache && core.chainCache.channels) {
            core.chainCache.channels[targetChannel] = {
              data: accountData,
              timestamp: Date.now(),
            };
          }
        } catch (err) {
          console.error(`Active refresh failed for ?${targetChannel}:`, err);
          if (core.chainCache?.channels?.[targetChannel]) {
            core.chainCache.channels[targetChannel].timestamp = 0;
          }
        }
      }, 105000);
    } catch (err) {
      console.error('Error generating tx:', err);
      return server.reply({
        cmd: 'warn',
        text: 'RPC error, try again later',
        id: Errors.Wallet.RPC_ERROR,
        channel: targetChannel,
      }, socket);
    }
  }

  // target local non-blockchain clients
  const targetClients = server.findSockets({
    channels: (channels) => channels && channels.includes(targetChannel),
    trip: payload.trip,
  });

  for (let i = 0, j = targetClients.length; i < j; i += 1) {
    const targetSocket = targetClients[i];
    const targetLevel = getUserLevel(targetSocket, targetChannel);

    if (targetLevel >= requestLevel) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to set level: Target has same or better credentials',
        id: Errors.SetLevel.BAD_LEVEL,
        channel: targetChannel,
      }, socket);
    } else {
      if (!targetSocket.channelStates) {
        targetSocket.channelStates = {};
      }

      targetSocket.channelStates[targetChannel] = {
        level: newLevel,
        trip: payload.trip,
      };

      const updateNotice = {
        ...getUserDetails(targetSocket, targetChannel),
        ...{
          cmd: 'updateUser',
          channel: targetChannel,
        },
      };

      const channelFilter = (client) => client.channels && client.channels.includes(targetChannel);

      server.broadcast(updateNotice, channelFilter);

      server.reply({
        cmd: 'session',
        restored: false,
        token: getSession(targetSocket, core),
        channels: targetSocket.channels,
      }, targetSocket);

      server.broadcast({
        cmd: 'info',
        text: `Changed permission level of "${payload.trip}" to "${payload.level}"`,
        id: Info.ChannelInfo.PERMS_CHANGED,
        args: {
          trip: payload.trip,
          level: payload.level,
        },
        channel: targetChannel,
      }, channelFilter);
    }
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
  server.registerHook('in', 'chat', this.setlevelCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function setlevelCheck({
  core, server, socket, payload,
}) {
  if (!payload || typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /setlevel command
  if (payload.text.startsWith('/setlevel')) {
    const input = payload.text.split(' ');

    // require trip parameter
    if (!input[1]) {
      return server.reply({
        cmd: 'warn',
        text: 'Failed to set level: Invalid trip. Refer to `/help setlevel` for instructions on how to use this command',
        id: Errors.SetLevel.BAD_TRIP,
        channel: targetChannel,
      }, socket);
    }

    // require level parameter
    if (!input[2]) {
      const validLabels = core.levelLabels.join(', ');
      return server.reply({
        cmd: 'warn',
        text: `Failed to set level: Invalid level label; choices are case sensitive: ${validLabels}`,
        id: Errors.SetLevel.BAD_LABEL,
        args: { validLabels },
        channel: targetChannel,
      }, socket);
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'setlevel',
        trip: input[1],
        level: input[2],
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "trip", "level"
  * @public
  * @typedef {Array} setlevel/requiredData
  */
export const requiredData = ['trip', 'level'];

/**
  * Module meta information
  * @public
  * @typedef {Object} setlevel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'setlevel',
  category: 'channels',
  description: 'Alter the permission level a trip is allowed within current channel',
  usage: `
    API: { cmd: 'setlevel', trip: '[target trip]', level: '[level label]' }
    Text: /setlevel <trip> <"channelModerator" | "channelTrusted" | "trustedUser" | "default" | "bot">`,
};
