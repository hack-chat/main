/**
  * @author MinusGix ( https://github.com/MinusGix )
  * @summary Change target message
  * @version v1.0.0
  * @description Will alter a previously sent message using that message's customId
  * @module updateMessage
  */

import {
  parseText,
} from '../utility/_Text.js';
import {
  isAdmin,
  isModerator,
} from '../utility/_UAC.js';
import {
  ACTIVE_MESSAGES,
  MAX_MESSAGE_ID_LENGTH,
} from './chat.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  // undefined | "overwrite" | "append" | "prepend" | "complete"
  const { customId } = payload;
  let { mode, text } = payload;

  if (!mode) {
    mode = 'overwrite';
  }

  if (mode !== 'overwrite' && mode !== 'append' && mode !== 'prepend' && mode !== 'complete') {
    return server.police.frisk(socket, 13);
  }

  if (!customId || typeof customId !== 'string' || customId.length > MAX_MESSAGE_ID_LENGTH) {
    return server.police.frisk(socket, 13);
  }

  if (typeof (text) !== 'string') {
    return server.police.frisk(socket, 13);
  }

  if (mode === 'overwrite') {
    text = parseText(text);

    if (text === '') {
      text = '\u0000';
    }
  }

  if (!text) {
    return server.police.frisk(socket, 13);
  }

  // TODO: What score should we use for this? It isn't as space filling as chat messages.
  // But we also don't want a massive growing message.
  // Or flashing between huge and small. Etc.

  let message;
  for (let i = 0; i < ACTIVE_MESSAGES.length; i += 1) {
    const msg = ACTIVE_MESSAGES[i];

    if (msg.userid === socket.userid && msg.customId === customId) {
      message = ACTIVE_MESSAGES[i];
      if (mode === 'complete') {
        ACTIVE_MESSAGES[i].toDelete = true;
      }
      break;
    }
  }

  if (!message) {
    return server.police.frisk(socket, 6);
  }

  const outgoingPayload = {
    cmd: 'updateMessage',
    userid: socket.userid,
    channel: socket.channel,
    level: socket.level,
    mode,
    text,
    customId: message.customId,
  };

  if (isAdmin(socket.level)) {
    outgoingPayload.admin = true;
  } else if (isModerator(socket.level)) {
    outgoingPayload.mod = true;
  }

  server.broadcast(outgoingPayload, { channel: socket.channel });

  return true;
}

/**
  * The following payload properties are required to invoke this module:
  * "text", "customId"
  * @public
  * @typedef {Array} addmod/requiredData
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
    API: { cmd: 'updateMessage', mode: 'overwrite'|'append'|'prepend'|'complete', text: '<text to apply>', customId: '<customId sent with the chat message>' }`,
};
