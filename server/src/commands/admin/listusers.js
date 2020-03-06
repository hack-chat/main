/*
  Description: Outputs all current channels and their user nicks
*/

import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket) {
  // increase rate limit chance and ignore if not admin
  if (!UAC.isAdmin(socket.level)) {
    return server.police.frisk(socket.address, 20);
  }

  // find all users currently in a channel
  const currentUsers = server.findSockets({
    channel: (channel) => true,
  });

  // compile channel and user list
  const channels = {};
  for (let i = 0, j = currentUsers.length; i < j; i += 1) {
    if (typeof channels[currentUsers[i].channel] === 'undefined') {
      channels[currentUsers[i].channel] = [];
    }

    channels[currentUsers[i].channel].push(
      `[${currentUsers[i].trip || 'null'}]${currentUsers[i].nick}`,
    );
  }

  // build output
  const lines = [];
  for (const channel in channels) {
    lines.push(`?${channel} ${channels[channel].join(', ')}`);
  }

  // send reply
  server.reply({
    cmd: 'info',
    text: lines.join('\n'),
  }, socket);

  return true;
}

export const info = {
  name: 'listusers',
  description: 'Outputs all current channels and sockets in those channels',
  usage: `
    API: { cmd: 'listusers' }`,
};
