/* eslint no-param-reassign: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Enables the captcha
  * @version 1.1.0
  * @description Enables the captcha on the channel specified in the channel property,
  * default is current channel
  * @module enablecaptcha
  */

import captcha from 'ascii-captcha';

import {
  isTrustedUser,
  isChannelModerator,
  verifyNickname,
  getUserPerms,
  levels,
  getUserLevel,
} from '../utility/_UAC.js';
import {
  canJoinChannel,
  getChannelSettings,
} from '../utility/_Channels.js';
import {
  upgradeLegacyJoin,
  legacyLevelToLabel,
} from '../utility/_LegacyFunctions.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // initialize captcha tracking object
  if (typeof core.captchas === 'undefined') {
    core.captchas = {};
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
    return server.police.frisk(socket, 10);
  }

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce moderator permission
  if (currentLevel < levels.channelModerator) {
    return server.police.frisk(socket, 10);
  }

  // check if already enabled
  if (core.captchas[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Captcha is already enabled',
      id: Info.Captcha.ALREADY_ENABLED,
      channel: targetChannel,
    }, socket);
  }

  // enable captcha for target channel
  core.captchas[targetChannel] = true;

  // notify moderators
  server.broadcast({
    cmd: 'info',
    text: `Captcha enabled on: ?${targetChannel}`,
    id: Info.Captcha.ENABLED,
    args: { targetChannel },
    channel: targetChannel,
  }, (client) => {
    const inChannel = (client.channels && client.channels.includes(targetChannel));
    return inChannel && isChannelModerator(client, targetChannel);
  });

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 5);
  server.registerHook('in', 'join', this.joinCheck.bind(this), 5);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hook incoming chat commands, check if they are answering a captcha
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  // always verify user input
  if (payload && typeof payload.text !== 'string') {
    return false;
  }

  // intercept chat if user is being challenged
  if (typeof socket.captcha !== 'undefined') {
    if (socket.captcha.awaiting === true) {
      if (payload.text === socket.captcha.solution) {
        if (typeof socket.captcha.whitelist === 'undefined') {
          socket.captcha.whitelist = [];
        }

        // add channel to whitelist and clear challenge
        socket.captcha.whitelist.push(socket.captcha.origChannel);
        socket.captcha.awaiting = false;

        // reconstruct join payload
        if (socket.hcProtocol === 1) {
          core.commands.handleCommand(server, socket, {
            cmd: 'join',
            nick: `${socket.captcha.origNick}#${socket.captcha.origPass}`,
            channel: socket.captcha.origChannel,
          });
        } else {
          core.commands.handleCommand(server, socket, {
            cmd: 'join',
            nick: socket.captcha.origNick,
            pass: socket.captcha.origPass,
            channel: socket.captcha.origChannel,
          });
        }

        return false;
      }

      // fail on bad captcha solution
      server.reply({
        cmd: 'warn',
        text: 'Incorrect captcha',
        id: Errors.Captcha.BAD_CAPTCHA,
        channel: false,
      }, socket);

      server.police.frisk(socket, 7);
      socket.captcha.awaiting = false;

      return false;
    }
  }

  // intercept command to enable captcha
  if (payload.text === '/enablecaptcha') {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'enablecaptcha',
        channel: payload.channel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming join command is invoked;
  * hook incoming join commands, check if they are joining a captcha protected channel
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function joinCheck({
  core, server, socket, payload,
}) {
  if (typeof payload === 'undefined' || typeof payload.channel === 'undefined') {
    return false;
  }

  // bypass if channel does not have captcha enabled
  if (core.captchas[payload.channel] !== true) {
    return payload;
  }

  // bypass if user is already whitelisted
  if (
    socket.captcha
    && socket.captcha.whitelist
    && socket.captcha.whitelist.includes(payload.channel)
  ) {
    return payload;
  }

  // `join` is the legacy entry point, check if it needs to be upgraded
  const origPayload = { ...payload };
  if (typeof socket.hcProtocol === 'undefined' || socket.hcProtocol === 1) {
    payload = upgradeLegacyJoin(server, socket, payload);
  }

  // store payload values
  const { channel, nick, pass } = payload;

  // check if a client is able to join target channel
  const mayJoin = canJoinChannel(channel, socket);
  if (mayJoin !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not join that channel',
      id: mayJoin,
      channel: false,
    }, socket);
  }

  // validates the user input for `nick`
  if (verifyNickname(nick, socket) !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'Username must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: false,
    }, socket);
  }

  // get trip and level
  const { trip, level: baseLevel } = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);
  let level = baseLevel;

  const channelSettings = getChannelSettings(core.appConfig.data, channel);

  // resolve local level
  if (channelSettings.owned) {
    if (channelSettings.ownerTrip === trip) {
      level = levels.channelOwner;
    } else if (channelSettings.tripLevels && channelSettings.tripLevels[trip]) {
      level = channelSettings.tripLevels[trip];
    }
  }

  // check if channel is locked higher than the user
  if (level < channelSettings.lockLevel) {
    return origPayload;
  }

  // store the user values
  const userInfo = {
    nick,
    trip,
    uType: legacyLevelToLabel(level),
    hash: socket.hash,
    level,
    userid: socket.userid,
    isBot: socket.isBot,
    color: socket.color,
    channel,
  };

  // present challenge to unauthorized users
  if (userInfo.uType === 'user') {
    if (userInfo.trip == null || isTrustedUser(level) === false) {
      // stage the challenge state
      socket.captcha = {
        awaiting: true,
        origChannel: payload.channel,
        origNick: payload.nick,
        origPass: pass,
        solution: captcha.generateRandomText(6),
        whitelist: socket.captcha && socket.captcha.whitelist ? socket.captcha.whitelist : [],
      };

      // notify user to solve
      /* server.reply({
        cmd: 'warn',
        text: 'Enter the following (case-sensitive)',
        id: Errors.Captcha.MUST_SOLVE,
        channel: false,
      }, socket); */

      // dispatch ascii challenge text
      server.reply({
        cmd: 'captcha',
        text: captcha.word2Transformedstr(socket.captcha.solution),
        channel: payload.channel,
      }, socket);

      return false;
    }
  }

  return origPayload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} enablecaptcha/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'enablecaptcha',
  category: 'moderators',
  description: 'Enables a captcha in the current channel you are in',
  usage: `
    API: { cmd: 'enablecaptcha', channel: '<optional channel>' }
    Text: /enablecaptcha`,
};
