/*
 * Description: Make a user (spammer) dumb
 * Author: simple
 */

exports.init = (core) => {
    core.muzzledHashes = {};
}

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
  let badClient = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClient.length === 0) {
    server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);

    return;
  }

  badClient = badClient[0];

  // likely dont need this, muting mods and admins is fine
  if (badClient.uType !== 'user') {
    server.reply({
      cmd: 'warn',
      text: 'This trick wont work on mods and admin'
    }, socket);

    return;
  }

  // store hash in mute list
  let record = core.muzzledHashes[badClient.hash] = {
      dumb:true
  }

  // store allies if needed
  if(data.allies && Array.isArray(data.allies)){
      record.allies = data.allies;
  }

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} muzzled ${data.nick} in ${socket.channel}, userhash: ${badClient.hash}`
  }, { uType: 'mod' });
}

exports.requiredData = ['nick'];

exports.info = {
  name: 'dumb',
  usage: 'dumb {nick} [allies...]',
  description: 'Globally shadow mute a connection. Optional allies array will see muted messages.'
};
