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
  isModerator,
  verifyNickname,
  getUserPerms,
} from '../utility/_UAC.js';
import {
  canJoinChannel,
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
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  let targetChannel;

  if (typeof payload.channel !== 'string') {
    if (typeof socket.channel !== 'string') { // @todo Multichannel
      return false; // silently fail
    }

    targetChannel = socket.channel;
  } else {
    targetChannel = payload.channel;
  }

  if (core.captchas[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Captcha is already enabled.',
      id: Info.Captcha.ALREADY_ENABLED,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  core.captchas[targetChannel] = true;

  server.broadcast({
    cmd: 'info',
    text: `Captcha enabled on: ${targetChannel}`,
    id: Info.Captcha.ENABLED,
    channel: socket.channel, // @todo Multichannel, false for global info
  }, { channel: socket.channel, level: isModerator });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
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
  // always verifiy user input
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (typeof socket.captcha !== 'undefined') {
    if (socket.captcha.awaiting === true) {
      if (payload.text === socket.captcha.solution) {
        if (typeof socket.captcha.whitelist === 'undefined') {
          socket.captcha.whitelist = [];
        }

        socket.captcha.whitelist.push(socket.captcha.origChannel);
        socket.captcha.awaiting = false;

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

      server.police.frisk(socket, 7);
      socket.terminate();

      return false;
    }
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

  // check if channel has captcha enabled
  if (core.captchas[payload.channel] !== true) {
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
      text: 'You may not join that channel.',
      id: mayJoin,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // calling socket already in a channel
  // @todo multichannel update, will remove
  if (typeof socket.channel !== 'undefined') {
    return server.reply({
      cmd: 'warn',
      text: 'Joining more than one channel is not currently supported',
      id: Errors.Join.ALREADY_JOINED,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }
  // end todo

  // validates the user input for `nick`
  if (verifyNickname(nick, socket) !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // get trip and level
  const { trip, level } = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);

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

  if (userInfo.uType === 'user') {
    if (userInfo.trip == null || isTrustedUser(level) === false) {
      if (typeof socket.captcha === 'undefined') {
        socket.captcha = {
          awaiting: true,
          origChannel: payload.channel,
          origNick: payload.nick,
          origPass: pass,
          solution: captcha.generateRandomText(6),
        };

        server.reply({
          cmd: 'warn',
          text: 'Enter the following to join (case-sensitive):',
          id: Errors.Captcha.MUST_SOLVE,
          channel: payload.channel, // @todo Multichannel
        }, socket);

        server.reply({
          cmd: 'captcha',
          text: captcha.word2Transformedstr(socket.captcha.solution),
          channel: payload.channel, // @todo Multichannel
        }, socket);

        return false;
      }

      socket.terminate();

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
    API: { cmd: 'enablecaptcha', channel: '<optional channel, defaults to your current channel>' }`,
};
