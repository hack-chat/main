/*
  Description: Removes a target ip from the ratelimiter
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

  // find target
  let mode, target;
  if (typeof data.ip === 'string') {
    mode = 'ip';
    target = data.ip;
  } else {
    mode = 'hash';
    target = data.hash;
  }

  // remove arrest record
  server._police.pardon(target);

  // mask ip if used
  if (mode === 'ip') {
    target = server.getSocketHash(target);
  }
  console.log(`${socket.nick} [${socket.trip}] unbanned ${target} in ${socket.channel}`);

  // reply with success
  server.reply({
    cmd: 'info',
    text: `Unbanned ${target}`
  }, socket);

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} unbanned: ${target}`
  }, { uType: 'mod' });

  // stats are fun
  core.managers.stats.decrement('users-banned');
};

exports.info = {
  name: 'unban',
  usage: 'unban {[ip || hash]}',
  description: 'Removes target ip from the ratelimiter'
};
