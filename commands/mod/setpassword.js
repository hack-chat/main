/* eslint no-param-reassign: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Sets a password for the channel
  * @version 1.0.0
  * @description Requires users to enter a password to join the channel
  * @module setpassword
  */

import {
  isChannelModerator,
  getUserPerms,
  levels,
  getUserLevel,
} from '../utility/_UAC.js';
import {
  getChannelSettings,
} from '../utility/_Channels.js';
import { upgradeLegacyJoin } from '../utility/_LegacyFunctions.js';
import { Errors, Info } from '../utility/_Constants.js';

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // initialize password storage if missing
  if (typeof core.passwords === 'undefined') {
    core.passwords = {};
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

  // enforce moderation level
  if (currentLevel < levels.channelModerator) {
    return server.police.frisk(socket, 10);
  }

  // validate password input
  if (!payload.channelPassword || typeof payload.channelPassword !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid password',
      id: Errors.LockRoom.INVALID_PASSWORD,
      channel: targetChannel,
    }, socket);
  }

  // store the password
  core.passwords[targetChannel] = payload.channelPassword;

  // notify moderators
  server.broadcast({
    cmd: 'info',
    text: `Password protection enabled on: ?${targetChannel} by [${socket.trip}]${socket.nick}`,
    id: Info.Mod.PASS_ENABLED,
    args: {
      targetChannel,
      trip: socket.trip,
      nick: socket.nick,
    },
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
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 6);
  server.registerHook('in', 'join', this.joinCheck.bind(this), 6);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  if (payload && typeof payload.text !== 'string') return false;

  // intercept chat if user is being challenged for a password
  if (typeof socket.passwordReq !== 'undefined' && socket.passwordReq.awaiting === true) {
    if (payload.text === core.passwords[socket.passwordReq.origChannel]) {
      if (typeof socket.passwordReq.whitelist === 'undefined') {
        socket.passwordReq.whitelist = [];
      }

      // add channel to whitelist and clear challenge
      socket.passwordReq.whitelist.push(socket.passwordReq.origChannel);
      socket.passwordReq.awaiting = false;

      const newJoinPayload = {
        cmd: 'join',
        channel: socket.passwordReq.origChannel,
      };

      // reconstruct join payload
      if (socket.hcProtocol === 1) {
        newJoinPayload.nick = `${socket.passwordReq.origNick}#${socket.passwordReq.origPass}`;
      } else {
        newJoinPayload.nick = socket.passwordReq.origNick;
        newJoinPayload.pass = socket.passwordReq.origPass;
      }

      // route reconstructed payload
      core.commands.handleCommand(server, socket, newJoinPayload);
      return false;
    }

    // fail on bad password
    server.reply({
      cmd: 'warn',
      text: 'Invalid password',
      id: Errors.LockRoom.INVALID_PASSWORD,
      channel: false,
    }, socket);

    server.police.frisk(socket, 7);
    socket.passwordReq.awaiting = false;

    return false;
  }

  // intercept command to set password
  if (payload.text.startsWith('/setpassword ')) {
    const channelPassword = payload.text.split(' ')[1];

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'setpassword',
        channel: payload.channel,
        channelPassword,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming join command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function joinCheck({
  core, server, socket, payload,
}) {
  if (typeof payload === 'undefined' || typeof payload.channel === 'undefined') return false;

  // allow if no password is set
  if (
    typeof core.passwords[payload.channel] === 'undefined'
    || core.passwords[payload.channel] === false
  ) {
    return payload;
  }

  // allow if user is already whitelisted
  if (
    socket.passwordReq
    && socket.passwordReq.whitelist
    && socket.passwordReq.whitelist.includes(payload.channel)
  ) {
    return payload;
  }

  const origPayload = { ...payload };
  if (typeof socket.hcProtocol === 'undefined' || socket.hcProtocol === 1) {
    payload = upgradeLegacyJoin(server, socket, payload);
  }

  const { channel, nick, pass } = payload;
  let { level } = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);
  const { trip } = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);
  const channelSettings = getChannelSettings(core.appConfig.data, channel);

  // resolve local level
  if (channelSettings.owned) {
    if (channelSettings.ownerTrip === trip) {
      level = levels.channelOwner;
    } else if (channelSettings.tripLevels && channelSettings.tripLevels[trip]) {
      level = channelSettings.tripLevels[trip];
    }
  }

  // allow trusted users to bypass password
  if (level >= levels.channelTrusted) {
    return origPayload;
  }

  // stage the challenge state
  socket.passwordReq = {
    awaiting: true,
    origChannel: payload.channel,
    origNick: nick,
    origPass: pass,
    whitelist: socket.passwordReq && socket.passwordReq.whitelist
      ? socket.passwordReq.whitelist
      : [],
  };

  // dispatch challenge request
  server.reply({
    cmd: 'passwordreq',
    channel: payload.channel,
  }, socket);

  return false;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} setpassword/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'setpassword',
  category: 'moderators',
  description: 'Sets a password requiring users to enter it before joining the channel',
  usage: `
    API: { cmd: 'setpassword', channelPassword: '<string>' }
    Text: /setpassword <password>`,
};
