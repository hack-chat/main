/*
  Description: Broadcasts an emote to the current channel
*/

import { Commands, ChatCommand } from "../utility/Commands/_main";
import { RequirementMinimumParameterCount } from "../utility/Commands/_requirements";

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
export async function run(core, server, socket, payload) {
  // check user input
  const text = parseText(payload.text);

  if (!text) {
    // lets not send objects or empty text, yea?
    return server.police.frisk(socket.address, 8);
  }

  // check for spam
  const score = text.length / 83 / 4;
  if (server.police.frisk(socket.address, score)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.',
    }, socket);
  }

  const newPayload = {
    cmd: 'info',
    type: 'emote',
    nick: socket.nick,
    text: `@${socket.nick} ${text}`,
  };
  if (socket.trip) {
    newPayload.trip = socket.trip;
  }

  // broadcast to channel peers
  server.broadcast(newPayload, { channel: socket.channel });

  return true;
}

// module hook functions
export function initHooks(server) {
  Commands.addCommand(new ChatCommand("me")
    .addRequirements(new RequirementMinimumParameterCount(1))
    .onTrigger((_, core, server, socket, info) => {
      run(core, server, socket, {
        cmd: 'emote',
        text: info.getTail(),
      });
    }));
}

export const requiredData = ['text'];
export const info = {
  name: 'emote',
  description: 'Typical emote / action text',
  usage: `
    API: { cmd: 'emote', text: '<emote/action text>' }
    Text: /me <emote/action text>`,
};
