/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Sends a hack request to the target nick
  * @version 1.0.0
  * @description Please note that the term 'hack' is used in jest here
  * @module hack
  */

import {
  isChannelModerator,
} from '../utility/_UAC.js';
import {
  findUser,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';

const MaxUrlLength = 256;

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  /* core, */ server, socket, payload,
}) {
  if (!isChannelModerator(socket.level)) {
    server.police.frisk(socket, 10);

    return server.reply({
      cmd: 'warn',
      text: 'You must be using a trip code that is channelModerator or higher.',
      id: Errors.HackRequest.BAD_PERMS,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // check for spam
  if (server.police.frisk(socket, 4)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending hack requests too fast. Wait a moment before trying again.',
      id: Errors.HackRequest.RATELIMIT,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // verify user input
  // if this is a legacy client add missing params to payload
  if (typeof payload.channel !== 'string') payload.channel = socket.channel;

  if (socket.hcProtocol === 1) {
    if (typeof socket.channel === 'undefined' || typeof payload.nick !== 'string') {
      return true;
    }
  } else if (typeof payload.userid !== 'number') {
    return true;
  }

  if (typeof payload.lib !== 'string' || !payload.lib) {
    return true;
  }

  if (payload.lib.length > MaxUrlLength) {
    return server.reply({
      cmd: 'warn',
      text: 'Your URL is too long.',
      id: Errors.HackRequest.TOO_LONG,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (payload.lib.startsWith('https://') === false) {
    return server.reply({
      cmd: 'warn',
      text: 'Your URL should start with https://',
      id: Errors.HackRequest.BAD_URL,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // @todo Verify this socket is part of payload.channel - multichannel patch
  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // build request
  const outgoingPayload = {
    cmd: 'hackAttempt',
    channel: socket.channel, // @todo Multichannel
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
