/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Send chat messages
  * @version 1.0.0
  * @description Broadcasts passed `text` field to the calling users channel
  * @module chat
  */

import {
  parseText,
} from '../utility/_Text.js';
import {
  isAdmin,
  isModerator,
} from '../utility/_UAC.js';

/**
  * Maximum length of the customId property
  * @type {number}
  */
export const MAX_MESSAGE_ID_LENGTH = 6;

/**
  * The time in milliseconds before a message is considered stale, and thus no longer allowed
  * to be edited.
  * @type {number}
  */
const ACTIVE_TIMEOUT = 5 * 60 * 1000;

/**
  * The time in milliseconds that a check for stale messages should be performed.
  * @type {number}
  */
const TIMEOUT_CHECK_INTERVAL = 30 * 1000;

/**
  * Stores active messages that can be edited.
  * @type {{ customId: string, userid: number, sent: number }[]}
  */
export const ACTIVE_MESSAGES = [];

/**
  * Cleans up stale messages.
  * @public
  * @return {void}
  */
export function cleanActiveMessages() {
  const now = Date.now();
  for (let i = 0; i < ACTIVE_MESSAGES.length; i += 1) {
    const message = ACTIVE_MESSAGES[i];
    if (now - message.sent > ACTIVE_TIMEOUT || message.toDelete) {
      ACTIVE_MESSAGES.splice(i, 1);
      i -= 1;
    }
  }
}

// TODO: This won't get cleared on module reload.
setInterval(cleanActiveMessages, TIMEOUT_CHECK_INTERVAL);

/**
  * Adds a message to the active messages map.
  * @public
  * @param {string} id
  * @param {number} userid
  * @return {void}
  */
export function addActiveMessage(customId, userid) {
  ACTIVE_MESSAGES.push({
    customId,
    userid,
    sent: Date.now(),
    toDelete: false,
  });
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // check user input
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

  const { customId } = payload;

  if (typeof (customId) === 'string' && customId.length > MAX_MESSAGE_ID_LENGTH) {
    // There's a limit on the custom id length.
    return server.police.frisk(socket, 13);
  }

  // build chat payload
  const outgoingPayload = {
    cmd: 'chat',
    nick: socket.nick, /* @legacy */
    uType: socket.uType, /* @legacy */
    userid: socket.userid,
    channel: socket.channel,
    text,
    level: socket.level,
    customId,
  };

  if (isAdmin(socket.level)) {
    outgoingPayload.admin = true;
  } else if (isModerator(socket.level)) {
    outgoingPayload.mod = true;
  }

  if (socket.trip) {
    outgoingPayload.trip = socket.trip; /* @legacy */
  }

  if (socket.color) {
    outgoingPayload.color = socket.color;
  }

  addActiveMessage(outgoingPayload.customId, socket.userid);

  // broadcast to channel peers
  server.broadcast(outgoingPayload, { channel: socket.channel });

  // stats are fun
  core.stats.increment('messages-sent');

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server enviroment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.commandCheckIn.bind(this), 20);
  server.registerHook('in', 'chat', this.finalCmdCheck.bind(this), 254);
}

/**
  * Executes every time an incoming chat command is invoked;
  * checks for miscellaneous '/' based commands
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function commandCheckIn({ server, socket, payload }) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/myhash')) {
    server.reply({
      cmd: 'info',
      text: `Your hash: ${socket.hash}`,
      channel: socket.channel, // @todo Multichannel
    }, socket);

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming chat command is invoked;
  * assumes a failed chat command invocation and will reject with notice
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function finalCmdCheck({ server, socket, payload }) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (!payload.text.startsWith('/')) {
    return payload;
  }

  if (payload.text.startsWith('//')) {
    payload.text = payload.text.substr(1); // eslint-disable-line no-param-reassign

    return payload;
  }

  server.reply({
    cmd: 'warn', // @todo Add numeric error code as `id`
    text: `Unknown command: ${payload.text}`,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  return false;
}

/**
  * The following payload properties are required to invoke this module:
  * "text"
  * @public
  * @typedef {Array} chat/requiredData
  */
export const requiredData = ['text'];

/**
  * Module meta information
  * @public
  * @typedef {Object} chat/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'chat',
  category: 'core',
  description: 'Broadcasts passed `text` field to the calling users channel',
  usage: `
    API: { cmd: 'chat', text: '<text to send>' }
    Text: Uuuuhm. Just kind type in that little box at the bottom and hit enter.\n
    Bonus super secret hidden commands:
    /myhash`,
};
