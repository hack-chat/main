/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

import {
  findUser,
} from '../utility/_Channels';
import {
  Errors,
} from '../utility/_Constants';
import {
  legacyInviteOut,
  legacyInviteReply,
} from '../utility/_LegacyFunctions';

// module support functions
/**
  * Returns the channel that should be invited to.
  * @param {any} channel
  * @return {string}
  */
export function getChannel(channel = undefined) {
  if (typeof channel === 'string') {
    return channel;
  }
  return Math.random().toString(36).substr(2, 8);
}

// module main
export async function run({
  core, server, socket, payload,
}) {
  // check for spam
  if (server.police.frisk(socket.address, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending invites too fast. Wait a moment before trying again.',
      id: Errors.Invite.RATELIMIT,
    }, socket);
  }

  // verify user input
  // if this is a legacy client add missing params to payload
  if (socket.hcProtocol === 1) {
    if (typeof socket.channel === 'undefined' || typeof payload.nick !== 'string') {
      return true;
    }

    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  } else if (typeof payload.userid !== 'number' || typeof payload.channel !== 'string') {
    return true;
  }

  // @todo Verify this socket is part of payload.channel - multichannel patch
  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
    }, socket);
  }

  // generate common channel
  const channel = getChannel(payload.to);

  // build invite
  const outgoingPayload = {
    cmd: 'invite',
    channel: socket.channel,
    from: socket.userid,
    to: targetUser.userid,
    inviteChannel: channel,
  };

  // send invite notice to target client
  if (targetUser.hcProtocol === 1) {
    server.reply(legacyInviteOut(outgoingPayload, socket.nick), targetUser);
  } else {
    server.reply(outgoingPayload, targetUser);
  }

  // send invite notice to this client
  if (socket.hcProtocol === 1) {
    server.reply(legacyInviteReply(outgoingPayload, targetUser.nick), socket);
  } else {
    server.reply(outgoingPayload, socket);
  }

  // stats are fun
  core.stats.increment('invites-sent');

  return true;
}

export const requiredData = []; // ['nick'];
export const info = {
  name: 'invite',
  description: 'Sends an invite to the target client with the provided channel, or a random channel.',
  usage: `
    API: { cmd: 'invite', nick: '<target nickname>', to: '<optional destination channel>' }`,
};
