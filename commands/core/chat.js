/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Send chat messages
  * @version 1.0.0
  * @description Broadcasts passed `text` field to the calling users channel
  * @module chat
  */

import {
  isAdmin,
  isModerator,
} from '../utility/_UAC.js';

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
    return server.police.frisk(socket.address, 13);
  }

  // check for spam
  const score = text.length / 83 / 4;
  if (server.police.frisk(socket.address, score)) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.',
      channel: socket.channel, // @todo Multichannel
    }, socket);
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
