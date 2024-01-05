/* eslint no-param-reassign: 0 */
/* eslint no-multi-assign: 0 */

/**
  * @author OpSimple ( https://github.com/OpSimple )
  * @summary Muzzle a user
  * @version 1.0.0
  * @description Globally shadow mute a connection. Optional allies array will see muted messages.
  * @module dumb
  */

import {
  isModerator,
} from '../utility/_UAC.js';
import {
  findUser,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  legacyInviteReply,
  legacyWhisperReply,
} from '../utility/_LegacyFunctions.js';

/**
  * Returns the channel that should be invited to.
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
  * Check and trim string provided by remote client
  * @param {string} text - Subject string
  * @private
  * @todo Move into utility module
  * @return {string|boolean}
  */
const parseText = (text) => {
  // verifies user input is text
  if (typeof text !== 'string') {
    return false;
  }

  let sanitizedText = text;

  // strip newlines from beginning and end
  sanitizedText = sanitizedText.replace(/^\s*\n|^\s+$|\n\s*$/g, '');
  // replace 3+ newlines with just 2 newlines
  sanitizedText = sanitizedText.replace(/\n{3,}/g, '\n\n');

  return sanitizedText;
};

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export function init(core) {
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
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  // check user input
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'string') {
      return true;
    }

    payload.channel = socket.channel;
  } else if (typeof payload.userid !== 'number') {
    return true;
  }

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

  // likely dont need this, muting mods and admins is fine
  if (targetUser.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'This trick wont work on users of the same level',
      id: Errors.Global.PERMISSION,
      channel: socket.channel, // @todo Multichannel
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
    text: `${socket.nick}#${socket.trip} muzzled ${targetUser.nick} in ${payload.channel}, userhash: ${targetUser.hash}`,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
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

  if (core.muzzledHashes[socket.hash]) {
    // build fake chat payload
    const outgoingPayload = {
      cmd: 'chat',
      nick: socket.nick, /* @legacy */
      uType: socket.uType, /* @legacy */
      userid: socket.userid,
      channel: socket.channel,
      text: payload.text,
      level: socket.level,
    };

    if (socket.trip) {
      outgoingPayload.trip = socket.trip;
    }

    if (socket.color) {
      outgoingPayload.color = socket.color;
    }

    // broadcast to any duplicate connections in channel
    server.broadcast(outgoingPayload, { channel: socket.channel, hash: socket.hash });

    // broadcast to allies, if any
    if (core.muzzledHashes[socket.hash].allies) {
      server.broadcast(
        outgoingPayload,
        {
          channel: socket.channel,
          nick: core.muzzledHashes[socket.hash].allies,
        },
      );
    }

    /**
      * Blanket "spam" protection.
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
  if (core.muzzledHashes[socket.hash]) {
    // check for spam
    if (server.police.frisk(socket, 2)) {
      return server.reply({
        cmd: 'warn',
        text: 'You are sending invites too fast. Wait a moment before trying again.',
        id: Errors.Invite.RATELIMIT,
        channel: socket.channel, // @todo Multichannel
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
        channel: socket.channel, // @todo Multichannel
      }, socket);
    }

    // generate common channel
    const channel = getChannel(payload.to);

    // build invite
    const outgoingPayload = {
      cmd: 'invite',
      channel: socket.channel, // @todo Multichannel
      from: socket.userid,
      to: targetUser.userid,
      inviteChannel: channel,
    };

    // send invite notice to this client
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
  if (core.muzzledHashes[socket.hash]) {
    // if this is a legacy client add missing params to payload
    if (socket.hcProtocol === 1) {
      payload.channel = socket.channel; // eslint-disable-line no-param-reassign
    }

    // verify user input
    const text = parseText(payload.text);

    if (!text) {
      // lets not send objects or empty text, yea?
      return server.police.frisk(socket, 13);
    }

    // check for spam
    const score = text.length / 83 / 4;
    if (server.police.frisk(socket, score)) {
      return server.reply({
        cmd: 'warn', // @todo Add numeric error code as `id`
        text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.',
        channel: socket.channel, // @todo Multichannel
      }, socket);
    }

    const targetUser = findUser(server, payload);
    if (!targetUser) {
      return server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
        id: Errors.Global.UNKNOWN_USER,
        channel: socket.channel, // @todo Multichannel
      }, socket);
    }

    const outgoingPayload = {
      cmd: 'whisper',
      channel: socket.channel, // @todo Multichannel
      from: socket.userid,
      to: targetUser.userid,
      text,
    };

    // send invite notice to this client
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
