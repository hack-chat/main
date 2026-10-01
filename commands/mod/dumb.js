/* eslint no-param-reassign: 0 */
/* eslint no-multi-assign: 0 */

/**
  * @author OpSimple ( https://github.com/OpSimple )
  * @summary Muzzle a user
  * @version 1.1.0
  * @description Globally shadow mute a connection.
  * Optional allies array will see muted messages
  * @module dumb
  */

import {
  isModerator,
  getUserLevel,
  getAppearance,
} from '../utility/_UAC.js';
import {
  findUser,
} from '../utility/_Channels.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  legacyInviteReply,
  legacyWhisperReply,
} from '../utility/_LegacyFunctions.js';
import {
  parseText,
} from '../utility/_Text.js';

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
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export function init(core) {
  // initialize tracking object for muted users
  if (typeof core.muzzledHashes === 'undefined') {
    core.muzzledHashes = {};
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
  // enforce moderation level
  if (!isModerator(socket)) {
    return server.police.frisk(socket, 10);
  }

  const targetChannel = payload.channel;

  // check user input
  // accept either userid or nick, regardless of protocol
  if (typeof payload.userid !== 'number' && typeof payload.nick !== 'string') {
    return true;
  }

  // ensure channel is set for nick lookups
  if (!payload.channel) {
    payload.channel = targetChannel;
  }

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

  // likely dont need this, muting mods and admins is fine
  if (targetUser.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not do that',
      id: Errors.Global.PERMISSION,
      channel: targetChannel,
    }, socket);
  }

  // store hash in mute list
  const record = core.muzzledHashes[targetUser.hash] = {
    dumb: true,
  };

  // store allies if needed
  if (payload.allies && Array.isArray(payload.allies)) {
    record.allies = payload.allies;
  }

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} muzzled ${targetUser.nick} in ${targetChannel}, `
      + `userhash: ${targetUser.hash}`,
    id: Info.Mod.MUZZLED_DETAILED,
    args: {
      nick: socket.nick,
      trip: socket.trip,
      targetUser: targetUser.nick,
      targetChannel,
      targetHash: targetUser.hash,
    },
    channel: targetChannel,
  }, (client) => isModerator(client));

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 10);
  server.registerHook('in', 'invite', this.inviteCheck.bind(this), 10);
  server.registerHook('in', 'whisper', this.whisperCheck.bind(this), 10);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hook incoming chat commands, shadow-prevent chat if they are muzzled
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  // intercept messages from muzzled users
  if (core.muzzledHashes[socket.hash]) {
    const currentChannel = payload.channel;
    const effectiveLevel = getUserLevel(socket, currentChannel);
    const appearance = getAppearance(effectiveLevel);

    const effectiveTrip = (
      socket.channelStates
      && socket.channelStates[currentChannel]
      && socket.channelStates[currentChannel].trip
    ) || socket.trip;

    let messageColor = socket.color;
    if (
      socket.channelStates
      && socket.channelStates[currentChannel]
      && socket.channelStates[currentChannel].color
    ) {
      messageColor = socket.channelStates[currentChannel].color;
    }

    // build fake chat payload
    const outgoingPayload = {
      cmd: 'chat',
      nick: socket.nick, /* @legacy */
      uType: socket.uType, /* @legacy */
      userid: socket.userid,
      channel: currentChannel,
      text: payload.text,
      level: effectiveLevel,
      flair: appearance.flair,
      customId: '',
      id: Math.floor(Math.random() * 999999) + 1,
    };

    if (effectiveTrip) {
      outgoingPayload.trip = effectiveTrip;
    }

    if (messageColor) {
      outgoingPayload.color = messageColor;
    }

    // broadcast to any duplicate connections in channel
    server.broadcast(outgoingPayload, (client) => {
      const inChannel = (client.channels && client.channels.includes(currentChannel));
      return client.hash === socket.hash && inChannel;
    });

    // broadcast to allies, if any
    const { allies } = core.muzzledHashes[socket.hash];
    if (allies) {
      server.broadcast(outgoingPayload, (client) => {
        const inChannel = (client.channels && client.channels.includes(currentChannel));
        return allies.includes(client.nick) && inChannel;
      });
    }

    /**
      * Blanket "spam" protection
      * May expose the ratelimiting lines from `chat` and use that
      * @todo one day #lazydev
      */
    server.police.frisk(socket, 9);

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming chat command is invoked;
  * shadow-prevent all invites from muzzled users
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function inviteCheck({
  core, server, socket, payload,
}) {
  // intercept invites from muzzled users
  if (core.muzzledHashes[socket.hash]) {
    const currentChannel = payload.channel;

    // check for spam
    if (server.police.frisk(socket, 2)) {
      return server.reply({
        cmd: 'warn',
        text: 'You are sending invites too quickly. Wait a moment before trying again',
        id: Errors.Invite.RATELIMIT,
        channel: currentChannel,
      }, socket);
    }

    // find target user
    const targetUser = findUser(server, payload);
    if (!targetUser) {
      return server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
        id: Errors.Global.UNKNOWN_USER,
        channel: currentChannel,
      }, socket);
    }

    // generate common channel
    const channel = getChannel(payload.to);

    // build invite
    const outgoingPayload = {
      cmd: 'invite',
      channel: currentChannel,
      from: socket.userid,
      to: targetUser.userid,
      inviteChannel: channel,
    };

    // send invite notice only to the muzzled client
    if (socket.hcProtocol === 1) {
      server.reply(legacyInviteReply(outgoingPayload, targetUser.nick), socket);
    } else {
      server.reply(outgoingPayload, socket);
    }

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming chat command is invoked;
  * shadow-prevent all whispers from muzzled users
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function whisperCheck({
  core, server, socket, payload,
}) {
  // intercept whispers from muzzled users
  if (core.muzzledHashes[socket.hash]) {
    const currentChannel = payload.channel;

    // verify user input
    const text = parseText(payload.text);

    if (!text) {
      // lets not send objects or empty text, yea?
      return false;
    }

    // check for spam
    const score = text.length / 83 / 4;
    if (server.police.frisk(socket, score)) {
      return server.reply({
        cmd: 'warn',
        text: 'Issuing commands too quickly. Wait a moment before trying again',
        id: Errors.Global.RATELIMIT,
        channel: currentChannel,
      }, socket);
    }

    const targetUser = findUser(server, payload);
    if (!targetUser) {
      return server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
        id: Errors.Global.UNKNOWN_USER,
        channel: currentChannel,
      }, socket);
    }

    const outgoingPayload = {
      cmd: 'whisper',
      channel: currentChannel,
      from: socket.userid,
      to: targetUser.userid,
      text,
    };

    // send whisper reply only to the muzzled client
    if (socket.hcProtocol === 1) {
      server.reply(legacyWhisperReply(outgoingPayload, targetUser.nick), socket);
    } else {
      server.reply(outgoingPayload, socket);
    }

    targetUser.whisperReply = socket.nick;

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} dumb/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {Array} aliases - An array of alternative cmd names
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'dumb',
  category: 'moderators',
  description: 'Globally shadow mute a connection. Optional allies array will see muted messages.',
  aliases: ['muzzle', 'mute'],
  usage: `
    API: { cmd: 'dumb', nick: '<target nick>', allies: ['<optional nick array>', ...] }`,
};
