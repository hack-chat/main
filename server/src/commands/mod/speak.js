/*
 * Description: Pardon a dumb user to be able to speak again
 * Author: simple
 */

exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType == 'user') {
    server._police.frisk(socket.remoteAddress, 10);

    return;
  }

  // check user input
  if (typeof data.ip !== 'string' && typeof data.hash !== 'string') {
    server.reply({
      cmd: 'warn',
      text: "hash:'targethash' or ip:'1.2.3.4' is required"
    }, socket);

    return;
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
}

exports.info = {
  name: 'speak',
  usage: 'speak {[ip || hash]}',
  description: 'Pardon a dumb user to be able to speak again'
};
