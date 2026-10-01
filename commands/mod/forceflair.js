/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Force a certain flair on a connection
  * @version 1.1.0
  * @description Force a certain flair on a connection,
  * preventing unauthorized use of reserved flairs
  * @module forceflair
  */

import {
  getUserDetails,
  getUserLevel,
  levels,
  levelAppearance,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  findUser,
} from '../utility/_Channels.js';
import {
  getSession,
} from '../core/session.js';

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

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce moderator permission
  if (currentLevel < levels.channelModerator) {
    server.police.frisk(socket, 10);

    return server.reply({
      cmd: 'warn',
      text: 'You may not do that',
      id: Errors.Global.PERMISSION,
      channel: targetChannel,
    }, socket);
  }

  // check payload structure
  if (typeof payload.nick !== 'string' || typeof payload.flair !== 'string') {
    return true;
  }

  const newFlair = payload.flair;

  // validate flair length
  if (!newFlair || newFlair.length > 2) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid flair',
      id: Errors.ForceFlairErrors.INVALID_FLAIR,
      channel: targetChannel,
    }, socket);
  }

  const targetUser = findUser(server, { ...payload, channel: targetChannel });

  // verify target user
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  // prevent modifying users of equal or higher rank
  if (targetUser.globalLevel >= socket.globalLevel && socket.nick !== targetUser.nick) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not do that',
      id: Errors.Global.PERMISSION,
      channel: targetChannel,
    }, socket);
  }

  const targetLevel = getUserLevel(targetUser, targetChannel);
  const reservedFlairs = ['🌟', '⭐', '👑', '💫'];

  // restrict assignment of reserved administrative flairs
  if (reservedFlairs.includes(newFlair)) {
    const appropriateFlair = levelAppearance[targetLevel]
      ? levelAppearance[targetLevel].flair
      : null;

    if (newFlair !== appropriateFlair) {
      return server.reply({
        cmd: 'warn',
        text: 'You may not do that',
        id: Errors.Global.PERMISSION,
        channel: targetChannel,
      }, socket);
    }
  }

  // ensure channel states are initialized
  if (!targetUser.channelStates) {
    targetUser.channelStates = {};
  }

  if (!targetUser.channelStates[targetChannel]) {
    targetUser.channelStates[targetChannel] = {
      level: getUserLevel(targetUser, targetChannel),
      trip: targetUser.trip,
    };
  }

  // apply new flair to target
  targetUser.channelStates[targetChannel].flair = newFlair;

  const details = getUserDetails(targetUser, targetChannel);

  // broadcast updated user details to the channel
  server.broadcast({
    ...details,
    cmd: 'updateUser',
    channel: targetChannel,
  }, (client) => {
    if (client.channels && client.channels.includes(targetChannel)) {
      return true;
    }

    return false;
  });

  // sync session on target client
  server.reply({
    cmd: 'session',
    restored: false,
    token: getSession(targetUser, core),
    channels: targetUser.channels,
  }, targetUser);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.flairCheck.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /forceflair
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function flairCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  // intercept /forceflair command
  if (payload.text.startsWith('/forceflair ')) {
    const input = payload.text.split(' ');
    const targetChannel = payload.channel;

    // missing target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forceflair` for instructions on how to use this command',
        id: Errors.ForceFlairErrors.MISSING_NICK,
        channel: targetChannel,
      }, socket);

      return false;
    }

    // missing flair parameter
    if (input[2] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid flair',
        id: Errors.ForceFlairErrors.INVALID_FLAIR,
        channel: targetChannel,
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'forceflair',
        nick: target,
        flair: input[2],
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "nick", "flair"
  * @public
  * @typedef {Array} forceflair/requiredData
  */
export const requiredData = ['nick', 'flair'];

/**
  * Module meta information
  * @public
  * @typedef {Object} forceflair/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'forceflair',
  category: 'moderators',
  description: 'Forces a flair onto a connection',
  usage: `
    API: { cmd: 'forceflair', nick: '<target nick>', flair: '<single utf flair>' }
    Text: /forceflair <target nick> <single utf flair>`,
};
