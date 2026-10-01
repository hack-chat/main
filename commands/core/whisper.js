/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Send whisper
  * @version 1.0.0
  * @description Display text on target users screen that only they can see
  * @module whisper
  */

import {
  findUser,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  legacyWhisperOut,
  legacyWhisperReply,
} from '../utility/_LegacyFunctions.js';
import {
  parseText,
} from '../utility/_Text.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 1);
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
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  payload.channel = targetChannel;

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

  // construct payload
  const outgoingPayload = {
    cmd: 'whisper',
    channel: targetChannel,
    from: socket.userid,
    to: targetUser.userid,
    text,
  };

  // send invite notice to target client
  if (targetUser.hcProtocol === 1) {
    server.reply(legacyWhisperOut(outgoingPayload, socket), targetUser);
  } else {
    server.reply(outgoingPayload, targetUser);
  }

  // send invite notice to this client
  if (socket.hcProtocol === 1) {
    server.reply(legacyWhisperReply(outgoingPayload, targetUser.nick), socket);
  } else {
    server.reply(outgoingPayload, socket);
  }

  // store sender details for reply command
  targetUser.whisperReply = {
    nick: socket.nick,
    channel: targetChannel,
  };

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.whisperCheck.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /whisper
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function whisperCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /whisper command
  if (payload.text.startsWith('/whisper ') || payload.text.startsWith('/w ')) {
    const input = payload.text.split(' ');

    // no nickname target parameter
    if (!input[1]) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help whisper` for instructions on how to use this command',
        id: Errors.Whisper.MISSING_NICK,
        channel: targetChannel,
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');
    input.splice(0, 2);
    const whisperText = input.join(' ');

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'whisper',
        channel: targetChannel,
        nick: target,
        text: whisperText,
      },
    });

    return false;
  }

  // intercept /reply command
  if (payload.text.startsWith('/reply ') || payload.text.startsWith('/r ')) {
    // ensure there is someone to reply to
    if (typeof socket.whisperReply === 'undefined') {
      server.reply({
        cmd: 'warn',
        text: 'Cannot reply to nobody',
        id: Errors.Whisper.NO_REPLY,
        channel: targetChannel,
      }, socket);

      return false;
    }

    const input = payload.text.split(' ');
    input.splice(0, 1);
    const whisperText = input.join(' ');

    let replyNick;
    let replyChannel;

    // handle legacy vs updated reply formats
    if (typeof socket.whisperReply === 'object') {
      replyNick = socket.whisperReply.nick;
      replyChannel = socket.whisperReply.channel;
    } else {
      replyNick = socket.whisperReply;
      replyChannel = targetChannel;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'whisper',
        nick: replyNick,
        channel: replyChannel,
        text: whisperText,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "nick", "text"
  * @public
  * @typedef {Array} whisper/requiredData
  */
export const requiredData = ['nick', 'text'];

/**
  * Module meta information
  * @public
  * @typedef {Object} whisper/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'whisper',
  category: 'core',
  description: 'Display text on target users screen that only they can see',
  usage: `
    API: { cmd: 'whisper', nick: '<target name>', text: '<text to whisper>' }
    Text: /whisper <target name> <text to whisper>
    Text: /w <target name> <text to whisper>
    Alt Text: /reply <text to whisper, this will auto reply to the last person who whispered to you>
    Alt Text: /r <text to whisper, this will auto reply to the last person who whispered to you>`,
};
