/*
 * Description: Pardon a dumb user to be able to speak again
 * Author: simple
 */

exports.run = async (core, server, socket, data) => {
  if (socket.uType == 'user') {
    // ignore if not mod or admin
    return;
  }

  if (typeof data.ip !== 'string' && typeof data.hash !== 'string') {
    server.reply({
      cmd: 'warn',
      text: "hash:'targethash' or ip:'1.2.3.4' is required"
    }, socket);

    return;
  }

  let target;

  if (typeof data.ip === 'string') {
    target = getSocketHash(data.ip);
  } else {
    target = data.hash;
  }

  delete core.muzzledHashes[target];

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
