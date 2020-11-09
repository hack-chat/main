/*
  Description: Forces a change on the target socket's nick color
*/

import {
  isModerator,
  getUserDetails,
} from '../utility/_UAC';
import {
  Errors,
} from '../utility/_Constants';
import {
  findUser,
} from '../utility/_Channels';

const verifyColor = (color) => /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(color);

// module main
export async function run({
  server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  const channel = socket.channel;
  if (typeof payload.channel === 'undefined') {
    payload.channel = channel;
  }

  // check user input
  if (typeof payload.nick !== 'string') {
    return true;
  }

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

  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // TODO: Change this uType to use level / uac
  // i guess coloring mods or admins isn't the best idea?
  if (targetUser.uType !== 'user') {
    return true;
  }

  if (newColor === 'RESET') {
    targetUser.color = false;
  } else {
    targetUser.color = newColor;
  }

  // build update notice with new color
  const updateNotice = {
    ...getUserDetails(targetUser),
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
  server.registerHook('in', 'chat', this.colorCheck.bind(this), 20);
}

// hooks chat commands checking for /whisper
export function colorCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/forcecolor ')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forcecolor` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    if (input[2] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help forcecolor` for instructions on how to use this command.',
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'forcecolor',
        nick: target,
        color: input[2],
      },
    });

    return false;
  }

  return payload;
}

// module meta
export const requiredData = ['nick', 'color'];
export const info = {
  name: 'forcecolor',
  description: 'Forces a user nick to become a certain color',
  usage: `
    API: { cmd: 'forcecolor', nick: '<target nick>', color: '<color as hex>' }
Text: /forcecolor <target nick> <color as hex>`,
};
