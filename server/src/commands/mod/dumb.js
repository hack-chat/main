/* 
 * Description: Make a user (spammer) dumb
 * Author: simple
 */

exports.init = (core) => {
    core.muzzledHashes = {};
}

exports.run = async (core, server, socket, data) => {
  if (socket.uType == 'user') {
    // ignore if not mod or admin
    return;
  }

  if (typeof data.nick !== 'string') {
    return;
  }
  
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

  if (badClient.uType !== 'user') {
    server.reply({
      cmd: 'warn',
      text: 'This trick wont work on mods and admin'
    }, socket);

    return;
  }
  
  core.muzzledHashes[badClient.hash] = true;
  
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick} muzzled ${targetNick} in ${socket.channel}, userhash: ${badClient.hash}`
  }, { uType: 'mod' });
  
}

exports.requiredData = ['nick'];

exports.info = {
  name: 'dumb',
  usage: 'dumb {nick}',
  description: 'Cleanly disable a user messages and make him dumb'
};
