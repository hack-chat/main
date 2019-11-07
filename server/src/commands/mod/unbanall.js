/*
  Description: Clears all bans and ratelimits
*/

// module main
export async function run(core, server, socket) {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
    return server.police.frisk(socket.address, 10);
  }

  // remove arrest records
  server.police.clear();

  console.log(`${socket.nick} [${socket.trip}] unbanned all`);

  // reply with success
  server.reply({
    cmd: 'info',
    text: 'Unbanned all ip addresses',
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} unbanned all ip addresses`,
  }, { uType: 'mod' });

  return true;
}

export const info = {
  name: 'unbanall',
  description: 'Clears all banned ip addresses',
  usage: `
    API: { cmd: 'unbanall' }`,
};
