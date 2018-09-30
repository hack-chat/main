/*
  Description: Clears all bans and ratelimits
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
    return server._police.frisk(socket.remoteAddress, 10);
  }

  // remove arrest records
  server._police._records = {};

  console.log(`${socket.nick} [${socket.trip}] unbanned all`);

  // reply with success
  server.reply({
    cmd: 'info',
    text: `Unbanned all ip addresses`
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} unbanned all ip addresses`
  }, { uType: 'mod' });
};

// module meta
exports.info = {
  name: 'unbanall',
  description: 'Clears all banned ip addresses',
  usage: `
    API: { cmd: 'unbanall' }`
};
