/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Emote / action text
  * @version 1.0.0
  * @description Broadcasts an emote to the current channel
  * @module emote
  */

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
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  // check user input
  let text = parseText(payload.text);

  if (!text) {
    // lets not send objects or empty text, yea?
    return server.police.frisk(socket, 8);
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

  if (!text.startsWith("'")) {
    text = ` ${text}`;
  }

  const newPayload = {
    cmd: 'emote',
    nick: socket.nick,
    userid: socket.userid,
    text: `@${socket.nick}${text}`,
    channel: socket.channel, // @todo Multichannel
  };

  if (socket.trip) {
    newPayload.trip = socket.trip;
  }

  // broadcast to channel peers
  server.broadcast(newPayload, { channel: socket.channel });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
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

  if (payload.text.startsWith('/me ')) {
    const input = payload.text.split(' ');

    // If there is no emote target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn', // @todo Add numeric error code as `id`
        text: 'Refer to `/help emote` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    input.splice(0, 1);
    const actionText = input.join(' ');

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'emote',
        text: actionText,
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
