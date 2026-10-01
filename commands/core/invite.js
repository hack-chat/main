/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Send an invite
  * @version 1.0.0
  * @description Sends an invite to the target client with the provided channel, or a random channel
  * @module invite
  */

import {
  findUser,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  legacyInviteOut,
  legacyInviteReply,
} from '../utility/_LegacyFunctions.js';

/**
  * Returns the channel that should be invited to
  * @param {any} channel
  * @private
  * @return {string}
  */
export function getChannel(channel = undefined) {
  if (typeof channel === 'string') {
    return channel;
  }

  return Math.random().toString(36).substr(2, 8);
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

  // check for spam
  if (server.police.frisk(socket, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending invites too quickly. Wait a moment before trying again',
      id: Errors.Invite.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // verify user input
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'string') {
      return true;
    }
  } else {
    if (typeof payload.nick !== 'string' && typeof payload.userid !== 'number') {
      return true;
    }

    if (typeof payload.channel !== 'string' && !targetChannel) {
      return true;
    }
  }

  // sync payload channel for the finder
  payload.channel = targetChannel;

  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  // generate destination channel (either provided 'to' or random)
  const destinationChannel = getChannel(payload.to);

  // build invite
  const outgoingPayload = {
    cmd: 'invite',
    channel: targetChannel,
    from: socket.userid,
    to: targetUser.userid,
    inviteChannel: destinationChannel,
  };

  // send invite notice to target client
  if (targetUser.hcProtocol === 1) {
    server.reply(legacyInviteOut(outgoingPayload, socket.nick), targetUser);
  } else {
    server.reply(outgoingPayload, targetUser);
  }

  // send invite notice to this client (confirmation)
  if (socket.hcProtocol === 1) {
    server.reply(legacyInviteReply(outgoingPayload, targetUser.nick), socket);
  } else {
    server.reply(outgoingPayload, socket);
  }

  // stats are fun
  core.stats.increment('invites-sent');

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} invite/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'invite',
  category: 'core',
  description: 'Sends an invite to the target client with the provided channel, or a random channel.',
  usage: `
    API: { cmd: 'invite', nick: '<target nickname>', to: '<optional destination channel>' }`,
};
