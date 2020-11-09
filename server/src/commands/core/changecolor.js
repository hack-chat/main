/*
  Description: Allows calling client to change their nickname color
*/

import {
  getUserDetails,
} from '../utility/_UAC';

// module support functions
const verifyColor = (color) => /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(color);

// module main
export async function run({
  server, socket, payload,
}) {
  const channel = socket.channel;

  if (server.police.frisk(socket.address, 1)) {
    return server.reply({
      cmd: 'warn', // @todo Add numeric error code as `id`
      text: 'You are changing colors too fast. Wait a moment before trying again.',
      channel, // @todo Multichannel
    }, socket);
  }

  // verify user data is string
  if (typeof payload.color !== 'string') {
    return true;
  }

  // make sure requested nickname meets standards
  const newColor = payload.color.trim().toUpperCase().replace(/#/g, '');
  if (newColor !== 'RESET' && !verifyColor(newColor)) {
    return server.reply({
      cmd: 'warn',
      text: 'Invalid color! Color must be in hex value',
      channel, // @todo Multichannel
    }, socket);
  }

  if (newColor === 'RESET') {
    socket.color = false; // eslint-disable-line no-param-reassign
  } else {
    socket.color = newColor; // eslint-disable-line no-param-reassign
  }

  // build update notice with new color
  const updateNotice = {
    ...getUserDetails(socket),
    ...{
      cmd: 'updateUser',
      channel: socket.channel, // @todo Multichannel
    },
  };

  // notify channel that the user has changed their name
  // @todo this should be sent to every channel the user is in (multichannel)
  server.broadcast(updateNotice, { channel: socket.channel });

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.colorCheck.bind(this), 29);
}

// hooks chat commands checking for /color
export function colorCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/color ')) {
    const input = payload.text.split(' ');

    // If there is no color target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help changecolor` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'changecolor',
        color: input[1],
      },
    });

    return false;
  }

  return payload;
}

// module meta
export const requiredData = ['color'];
export const info = {
  name: 'changecolor',
  description: 'This will change your nickname color',
  usage: `
    API: { cmd: 'changecolor', color: '<new color as hex>' }
    Text: /color <new color as hex>
    Removal: /color reset`,
};
