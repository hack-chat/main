/*
  Description: Display text on targets screen that only they can see
*/

// module support functions
const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

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
    return server._police.frisk(socket.remoteAddress, 13);
  }

  // check for spam
  let score = text.length / 83 / 4;
  if (server._police.frisk(socket.remoteAddress, score)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.'
    }, socket);
  }

  let targetNick = payload.nick;
  if (!verifyNickname(targetNick)) {
    return;
  }

  // find target user
  let targetClient = server.findSockets({ channel: socket.channel, nick: targetNick });

  if (targetClient.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);
  }

  targetClient = targetClient[0];

  server.reply({
    cmd: 'info',
    type: 'whisper',
    from: socket.nick,
    trip: socket.trip || 'null',
    text: `${socket.nick} whispered: ${text}`
  }, targetClient);

  targetClient.whisperReply = socket.nick;

  server.reply({
    cmd: 'info',
    type: 'whisper',
    text: `You whispered to @${targetNick}: ${text}`
  }, socket);
};

// module hook functions
exports.initHooks = (server) => {
  server.registerHook('in', 'chat', this.whisperCheck, 20);
};

// hooks chat commands checking for /whisper
exports.whisperCheck = (core, server, socket, payload) => {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/whisper')) {
    let input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help whisper` for instructions on how to use this command.'
      }, socket);

      return false;
    }

    let target = input[1].replace(/@/g, '');
    input.splice(0, 2);
    let whisperText = input.join(' ');

    this.run(core, server, socket, {
      cmd: 'whisper',
      nick: target,
      text: whisperText
    });

    return false;
  }

  if (payload.text.startsWith('/r ')) {
    if (typeof socket.whisperReply === 'undefined') {
      server.reply({
        cmd: 'warn',
        text: 'Cannot reply to nobody'
      }, socket);

      return false;
    }

    let input = payload.text.split(' ');
    input.splice(0, 1);
    let whisperText = input.join(' ');

    this.run(core, server, socket, {
      cmd: 'whisper',
      nick: socket.whisperReply,
      text: whisperText
    });

    return false;
  }

  return payload;
};

// module meta
exports.requiredData = ['nick', 'text'];
exports.info = {
  name: 'whisper',
  description: 'Display text on targets screen that only they can see',
  usage: `
    API: { cmd: 'whisper', nick: '<target name>', text: '<text to whisper>' }
    Text: /whisper <target name> <text to whisper>
    Alt Text: /r <text to whisper, this will auto reply to the last person who whispered to you>`
};
