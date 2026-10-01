/**
  * @author MinusGix ( https://github.com/MinusGix )
  * @summary Change target message
  * @version v1.1.0
  * @description Will alter a previously sent message using that message's customId
  * @module updateMessage
  */

import {
  parseText,
} from '../utility/_Text.js';
import {
  isAdmin,
  isModerator,
  getUserLevel,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';

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

  const { customId } = payload;
  let { mode, text } = payload;

  // default mode if unspecified
  if (!mode) {
    mode = 'overwrite';
  }

  // validate mode type
  if (mode !== 'overwrite' && mode !== 'append' && mode !== 'prepend' && mode !== 'complete') {
    return server.police.frisk(socket, 13);
  }

  // enforce id boundaries
  const idStr = String(customId);
  if (!customId || idStr.length > 10) {
    return server.police.frisk(socket, 13);
  }

  // ensure text is valid
  if (typeof text !== 'string') {
    return server.police.frisk(socket, 13);
  }

  text = parseText(text);

  // allow empty overwrite (clearing message), otherwise block empty text
  if (mode === 'overwrite' && text === '') {
    text = '\u0000';
  } else if (!text) {
    return server.police.frisk(socket, 13);
  }

  // spam prevention
  const score = text.length / 83 / 4;
  if (server.police.frisk(socket, score)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  const effectiveLevel = getUserLevel(socket, targetChannel);

  // construct payload
  const outgoingPayload = {
    cmd: 'updateMessage',
    userid: socket.userid,
    channel: targetChannel,
    level: effectiveLevel,
    mode,
    text,
    customId,
  };

  // append legacy perms
  if (isAdmin(socket)) {
    outgoingPayload.admin = true;
  } else if (isModerator(socket)) {
    outgoingPayload.mod = true;
  }

  // send to channel
  server.broadcast(outgoingPayload, (client) => {
    if (client.channels && client.channels.includes(targetChannel)) {
      return true;
    }

    return false;
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
  server.registerHook('in', 'chat', this.commandCheckIn.bind(this), 20);
}

/**
  * Executes every time an incoming chat command is invoked;
  * checks for miscellaneous '/' based commands
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function commandCheckIn({
  core, server, socket, payload,
}) {
  if (!payload || typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // check if invoking /edit
  if (payload.text.startsWith('/edit ')) {
    const match = payload.text.match(/^\/edit\s+(\S+)\s+(.+)$/is);

    // proxy command to execution function
    if (match) {
      const customId = match[1];
      const text = match[2];

      this.run({
        core,
        server,
        socket,
        payload: {
          cmd: 'updateMessage',
          customId,
          text,
          channel: targetChannel,
        },
      });

      return false;
    }
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "text", "customId"
  * @public
  * @typedef {Array} updateMessage/requiredData
  */
export const requiredData = ['text', 'customId'];

/**
  * Module meta information
  * @public
  * @typedef {Object} updateMessage/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'updateMessage',
  category: 'core',
  description: 'Update a message you have sent.',
  usage: `
    API: { cmd: 'updateMessage', mode: 'overwrite'|'append'|'prepend'|'complete', text: '<text to apply>', customId: '<customId sent with the chat message>' }
    Text: /edit <messageId> <new text>`,
};
