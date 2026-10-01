/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Sends a hack request to the target nick
  * @version 1.0.0
  * @description Please note that the term 'hack' is used in jest here
  * @module hack
  */

import {
  getUserLevel,
  levels,
} from '../utility/_UAC.js';
import {
  findUser,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';

// maximum allowed url length
const MaxUrlLength = 256;

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 1);
  }

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce moderator rank
  if (currentLevel < levels.channelModerator) {
    server.police.frisk(socket, 10);

    return server.reply({
      cmd: 'warn',
      text: 'You must be using a trip code that is channelModerator or higher',
      id: Errors.HackRequest.BAD_PERMS,
      channel: targetChannel,
    }, socket);
  }

  // check for spam
  if (server.police.frisk(socket, 4)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending hack requests too fast. Wait a moment before trying again',
      id: Errors.HackRequest.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // verify user input
  const hasNick = typeof payload.nick === 'string';
  const hasUserId = typeof payload.userid === 'number';

  if (!hasNick && !hasUserId) {
    return true;
  }

  if (!payload.channel) {
    payload.channel = targetChannel;
  }

  if (typeof payload.lib !== 'string' || !payload.lib) {
    return true;
  }

  // validate payload library url length
  if (payload.lib.length > MaxUrlLength) {
    return server.reply({
      cmd: 'warn',
      text: 'Your URL is too long',
      id: Errors.HackRequest.TOO_LONG,
      channel: targetChannel,
    }, socket);
  }

  // ensure url is secure
  if (payload.lib.startsWith('https://') === false) {
    return server.reply({
      cmd: 'warn',
      text: 'Your URL should start with https://',
      id: Errors.HackRequest.BAD_URL,
      channel: targetChannel,
    }, socket);
  }

  // find target user
  const targetUser = findUser(server, { ...payload, channel: targetChannel });

  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  // build request
  const outgoingPayload = {
    cmd: 'hackAttempt',
    channel: targetChannel,
    from: socket.userid,
    fromNick: socket.nick,
    lib: payload.lib,
  };

  // send request
  server.reply(outgoingPayload, targetUser);

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} hack/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'hack',
  category: 'moderators',
  description: 'Sends a hack request to the target nick.',
  usage: `
    API: { cmd: 'hack', nick: '<target nickname>', lib: '<url to js>' }`,
};
