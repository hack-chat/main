/*
  Description: Removes a target ip from the ratelimiter
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

  let mode, target;

  if (typeof data.ip === 'string') {
    mode = 'ip';
    target = data.ip;
  } else {
    mode = 'hash';
    target = data.hash;
  }

  server._police.pardon(target);

  if (mode === 'ip') {
    target = server.getSocketHash(target);
  }

  console.log(`${socket.nick} [${socket.trip}] unbanned ${target} in ${socket.channel}`);

  server.reply({
    cmd: 'info',
    text: `Unbanned ${target}`
  }, socket);

  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} unbanned: ${target}`
  }, { uType: 'mod' });

  core.managers.stats.decrement('users-banned');
};

exports.info = { name: 'unban' };
