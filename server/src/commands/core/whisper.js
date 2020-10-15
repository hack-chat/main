/*
  Description: Display text on targets screen that only they can see
  @todo This should be changed to it's own event type, instead of `info`
        and accept a `userid` rather than `nick`
*/

import {
  findUser,
} from '../utility/_Channels';
import {
  Errors,
} from '../utility/_Constants';
import {
  legacyWhisperOut,
  legacyWhisperReply,
} from '../utility/_LegacyFunctions';

// module support functions

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

// module main
export async function run({ server, socket, payload }) {
  // if this is a legacy client add missing params to payload
  if (socket.hcProtocol === 1) {
    payload.channel = socket.channel; // eslint-disable-line no-param-reassign
  }

  // verify user input
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

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.whisperCheck.bind(this), 20);
}

// hooks chat commands checking for /whisper
export function whisperCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/whisper') || payload.text.startsWith('/w ')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn', // @todo Add numeric error code as `id`
        text: 'Refer to `/help whisper` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');
    input.splice(0, 2);
    const whisperText = input.join(' ');

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'whisper',
        channel: socket.channel, // @todo Multichannel
        nick: target,
        text: whisperText,
      },
    });

    return false;
  }

  if (payload.text.startsWith('/r ')) {
    if (typeof socket.whisperReply === 'undefined') {
      server.reply({
        cmd: 'warn', // @todo Add numeric error code as `id`
        text: 'Cannot reply to nobody',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    const input = payload.text.split(' ');
    input.splice(0, 1);
    const whisperText = input.join(' ');

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'whisper',
        nick: socket.whisperReply,
        text: whisperText,
      },
    });

    return false;
  }

  return payload;
}

export const requiredData = ['nick', 'text'];
export const info = {
  name: 'whisper',
  description: 'Display text on targets screen that only they can see',
  usage: `
    API: { cmd: 'whisper', nick: '<target name>', text: '<text to whisper>' }
    Text: /whisper <target name> <text to whisper>
    Text: /w <target name> <text to whisper>
    Alt Text: /r <text to whisper, this will auto reply to the last person who whispered to you>`,
};
