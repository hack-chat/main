/*
 * Description: Pardon a dumb user to be able to speak again
 * Author: simple
 */

 // module constructor
 exports.init = (core) => {
   if (typeof core.muzzledHashes === 'undefined') {
     core.muzzledHashes = {};
   }
 };

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
    return server._police.frisk(socket.remoteAddress, 10);
  }

  // check user input
  if (typeof data.ip !== 'string' && typeof data.hash !== 'string') {
    return server.reply({
      cmd: 'warn',
      text: "hash:'targethash' or ip:'1.2.3.4' is required"
    }, socket);
  }

  // find target & remove mute status
  let target;
  if (typeof data.ip === 'string') {
    target = getSocketHash(data.ip);
  } else {
    target = data.hash;
  }

  delete core.muzzledHashes[target];

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} unmuzzled : ${target}`
  }, { uType: 'mod' });
};

// module meta
exports.info = {
  name: 'speak',
  description: 'Pardon a dumb user to be able to speak again',
  usage: `
    API: { cmd: 'speak', ip/hash: '<target ip or hash' }`
};
exports.info.aliases = ['unmuzzle', 'unmute'];
