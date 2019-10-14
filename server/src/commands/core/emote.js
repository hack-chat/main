/*
  Description: Broadcasts an emote to the current channel
*/

// module support functions
const parseText = (text) => {
  // verifies user input is text
  if (typeof text !== 'string') {
    return false;
  }

  // strip newlines from beginning and end
  text = text.replace(/^\s*\n|^\s+$|\n\s*$/g, '');
  // replace 3+ newlines with just 2 newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
};

// module main
exports.run = async (core, server, socket, payload) => {
  // check user input
  let text = parseText(payload.text);

  if (!text) {
    // lets not send objects or empty text, yea?
    return server.police.frisk(socket.remoteAddress, 8);
  }

  // check for spam
  let score = text.length / 83 / 4;
  if (server.police.frisk(socket.remoteAddress, score)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.'
    }, socket);
  }

  let newPayload = {
    cmd: 'info',
    type: 'emote',
    nick: socket.nick,
    text: `@${socket.nick} ${text}`
  };
  if (socket.trip) {
    newPayload.trip = socket.trip;
  }

  // broadcast to channel peers
  server.broadcast( newPayload, { channel: socket.channel});
};

// module hook functions
exports.initHooks = (server) => {
  server.registerHook('in', 'chat', this.emoteCheck, 30);
};

// hooks chat commands checking for /me
exports.emoteCheck = (core, server, socket, payload) => {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/me ')) {
    let input = payload.text.split(' ');

    // If there is no emote target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help emote` for instructions on how to use this command.'
      }, socket);

      return false;
    }

    input.splice(0, 1);
    let actionText = input.join(' ');

    this.run(core, server, socket, {
      cmd: 'emote',
      text: actionText
    });

    return false;
  }

  return payload;
};

// module meta
exports.requiredData = ['text'];
exports.info = {
  name: 'emote',
  description: 'Typical emote / action text',
  usage: `
    API: { cmd: 'emote', text: '<emote/action text>' }
    Text: /me <emote/action text>`
};
