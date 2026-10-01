/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Color a user
  * @version 1.1.0
  * @description Forces a user nick to become a certain color
  * @module forcecolor
  */

import {
  getUserDetails,
  getUserLevel,
  levels,
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
import {
  verifyColor,
} from '../utility/_Text.js';

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
  if (typeof payload.nick !== 'string' || typeof payload.color !== 'string') {
    return true;
  }

  // sanitize color input
  const newColor = payload.color.trim().toUpperCase().replace(/#/g, '');
  if (newColor !== 'RESET' && !verifyColor(newColor)) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid color! Color must be in hex value',
      id: Errors.ChangeColor.INVALID_COLOR,
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

  // prevent modifying users of equal or higher rank
  if (targetUser.globalLevel >= socket.globalLevel) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not do that',
      id: Errors.Global.PERMISSION,
      channel: targetChannel,
    }, socket);
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

  // apply new color or reset
  if (newColor === 'RESET') {
    delete targetUser.channelStates[targetChannel].color;
  } else {
    targetUser.channelStates[targetChannel].color = newColor;
  }

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
  server.registerHook('in', 'chat', this.colorCheck.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /forcecolor
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function colorCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  // intercept /forcecolor command
  if (payload.text.startsWith('/forcecolor ')) {
    const input = payload.text.split(' ');
    const targetChannel = payload.channel;

    // missing target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forcecolor` for instructions on how to use this command',
        id: Errors.ForceColor.MISSING_NICK,
        channel: targetChannel,
      }, socket);

      return false;
    }

    // missing color parameter
    if (input[2] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Invalid color! Color must be in hex value',
        id: Errors.ChangeColor.INVALID_COLOR,
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
        cmd: 'forcecolor',
        nick: target,
        color: input[2],
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "nick", "color"
  * @public
  * @typedef {Array} forcecolor/requiredData
  */
export const requiredData = ['nick', 'color'];

/**
  * Module meta information
  * @public
  * @typedef {Object} forcecolor/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'forcecolor',
  category: 'moderators',
  description: 'Forces a user nick to become a certain color',
  usage: `
    API: { cmd: 'forcecolor', nick: '<target nick>', color: '<color as hex>' }
    Text: /forcecolor <target nick> <color as hex>`,
};
