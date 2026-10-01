/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Emote / action text
  * @version 1.0.0
  * @description Broadcasts an emote to the current channel
  * @module emote
  */

import {
  Errors,
} from '../utility/_Constants.js';
import {
  parseText,
} from '../utility/_Text.js';
import {
  getUserLevel,
  getAppearance,
  isAdmin,
  isModerator,
} from '../utility/_UAC.js';

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

  // check user input
  let text = parseText(payload.text);

  if (!text) {
    // let's not send objects or empty text, yea?
    return server.police.frisk(socket, 8);
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

  // format action text
  if (!text.startsWith("'")) {
    text = ` ${text}`;
  }

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

  // construct payload
  const newPayload = {
    cmd: 'emote',
    nick: socket.nick,
    userid: socket.userid,
    text: `@${socket.nick}${text}`,
    channel: targetChannel,
    level: effectiveLevel,
    flair: appearance.flair,
  };

  if (effectiveTrip) {
    newPayload.trip = effectiveTrip;
  }

  if (messageColor) {
    newPayload.color = messageColor;
  }

  /* legacy */
  if (isAdmin(socket)) {
    newPayload.admin = true;
  } else if (isModerator(socket)) {
    newPayload.mod = true;
  }

  // broadcast to channel peers
  server.broadcast(newPayload, (client) => {
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
  server.registerHook('in', 'chat', this.emoteCheck.bind(this), 30);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /me
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function emoteCheck({
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

  // intercept /me command
  if (payload.text.startsWith('/me ')) {
    const input = payload.text.split(' ');

    // missing emote parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help emote` for instructions on how to use this command',
        id: Errors.Emote.MISSING_TEXT,
        channel: targetChannel,
      }, socket);

      return false;
    }

    input.splice(0, 1);
    const actionText = input.join(' ');

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'emote',
        text: actionText,
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "text"
  * @public
  * @typedef {Array} emote/requiredData
  */
export const requiredData = ['text'];

/**
  * Module meta information
  * @public
  * @typedef {Object} emote/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'emote',
  category: 'core',
  description: 'Broadcasts an emote to the current channel',
  usage: `
    API: { cmd: 'emote', text: '<emote/action text>' }
    Text: /me <emote/action text>`,
};
