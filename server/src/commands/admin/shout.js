/*
  Description: Emmits a server-wide message as `info`
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin
  if (!UAC.isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // send text to all users
  server.broadcast({
    cmd: 'info',
    text: `Server Notice: ${data.text}`,
  }, {});

  return true;
}
export function initHooks(server) {
  server.registerHook('in', 'chat', this.shoutCheck.bind(this));
}
//Faster operation
export function shoutCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
      return false;
  }
  if (payload.text.startsWith('/shout')) {
      const input = payload.text.split(' ');
      if (input[1] === undefined) {
          server.reply({
              cmd: 'warn',
              text: 'Refer to `/help shout` for instructions on how to use this command.',
          }, socket);
          return false;
      }
      this.run(core, server, socket, {
          cmd: 'shout',
          text: input[1],
      });
      return false;
  }
  return payload;
}
export const requiredData = ['text'];
export const info = {
  name: 'shout',
  description: 'Displays passed text to every client connected',
  usage: `
    API: { cmd: 'shout', text: '<shout text>' }
    Text: /shout <shout text>`,
};
