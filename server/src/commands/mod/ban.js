/*
  Description: Adds the target socket's ip to the ratelimiter
*/

exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType == 'user') {
    server._police.frisk(socket.remoteAddress, 10);

    return;
  }

  // check user input
  if (typeof data.nick !== 'string') {
    return;
  }

  // find target user
  let targetNick = data.nick;
  let badClient = server.findSockets({ channel: socket.channel, nick: targetNick });

  if (badClient.length === 0) {
    server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);

    return;
  }

  badClient = badClient[0];

  // i guess banning mods or admins isn't the best idea?
  if (badClient.uType !== 'user') {
    server.reply({
      cmd: 'warn',
      text: 'Cannot ban other mods, how rude'
    }, socket);

    return;
  }

  // commit arrest record
  server._police.arrest(badClient.remoteAddress, badClient.hash);

  console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${socket.channel}`);

  // notify normal users
  server.broadcast({
    cmd: 'info',
    text: `Banned ${targetNick}`
  }, { channel: socket.channel, uType: 'user' });

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} banned ${targetNick} in ${socket.channel}, userhash: ${badClient.hash}`
  }, { uType: 'mod' });

  // force connection closed
  badClient.terminate();

  // stats are fun
  core.managers.stats.increment('users-banned');
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'ban',
  usage: 'ban {nick}',
  description: 'Disconnects the target nickname in the same channel as calling socket & adds to ratelimiter'
};
