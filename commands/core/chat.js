/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Send chat messages
  * @version 1.0.0
  * @description Broadcasts passed `text` field to the calling users channel
  * @module chat
  */

import { parseText } from '../utility/_Text.js';
import {
  isAdmin,
  isModerator,
  getUserLevel,
  getAppearance,
} from '../utility/_UAC.js';
import { Errors, Info } from '../utility/_Constants.js';

export const MAX_MESSAGE_ID_LENGTH = 6;

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
    return server.police.frisk(socket, 1);
  }

  // check user input
  const text = parseText(payload.text);

  if (!text) {
    // let's not send objects or empty text, yea?
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

  const { customId } = payload;

  if (typeof customId === 'string' && customId.length > MAX_MESSAGE_ID_LENGTH) {
    return server.police.frisk(socket, 13);
  }

  const messageId = Math.floor(Math.random() * 999999) + 1;
  const effectiveLevel = getUserLevel(socket, targetChannel);
  const appearance = getAppearance(effectiveLevel);

  // resolve local or global trip
  const effectiveTrip = (
    socket.channelStates
    && socket.channelStates[targetChannel]
    && socket.channelStates[targetChannel].trip
  ) || socket.trip;

  let messageColor = socket.color;

  // resolve local or global color
  if (
    socket.channelStates
    && socket.channelStates[targetChannel]
    && socket.channelStates[targetChannel].color
  ) {
    messageColor = socket.channelStates[targetChannel].color;
  }

  // build chat payload
  const outgoingPayload = {
    cmd: 'chat',
    nick: socket.nick,
    uType: socket.uType,
    userid: socket.userid,
    channel: targetChannel,
    text,
    level: effectiveLevel,
    flair: appearance.flair,
    customId,
    id: messageId,
  };

  if (isAdmin(socket)) {
    outgoingPayload.admin = true;
  } else if (isModerator(socket)) {
    outgoingPayload.mod = true;
  }

  if (effectiveTrip) {
    outgoingPayload.trip = effectiveTrip;
  }

  if (messageColor) {
    outgoingPayload.color = messageColor;
  }

  // broadcast to channel peers
  server.broadcast(outgoingPayload, (client) => {
    if (client.channels && client.channels.includes(targetChannel)) {
      return true;
    }

    return false;
  });

  core.stats.increment('messages-sent');

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  // register early and late chat hooks
  server.registerHook('in', 'chat', this.commandCheckIn.bind(this), 20);
  server.registerHook('in', 'chat', this.finalCmdCheck.bind(this), 254);
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
export function commandCheckIn({ server, socket, payload }) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  // intercept /shrug command
  if (payload.text.startsWith('/shrug')) {
    payload.text = payload.text.replace(
      '/shrug',
      String.fromCharCode(175, 92, 92, 92, 95, 40, 12484, 41, 92, 95, 47, 175),
    );
  }

  // intercept /myhash command
  if (payload.text.startsWith('/myhash')) {
    server.reply({
      cmd: 'info',
      text: `${socket.hash}`,
      id: Info.Core.MY_HASH,
      channel: payload.channel,
    }, socket);

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming chat command is invoked;
  * assumes a failed chat command invocation and will reject with notice
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
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

  // allow escaping commands with double slash
  if (payload.text.startsWith('//')) {
    payload.text = payload.text.substring(1);
    return payload;
  }

  // intercept unresolved commands
  server.reply({
    cmd: 'warn',
    text: `Unknown command: ${payload.text}`,
    id: Errors.Global.UNKNOWN_CMD,
    args: { text: payload.text },
    channel: payload.channel,
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
