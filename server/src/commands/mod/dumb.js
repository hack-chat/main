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

  let badClient = server.findSockets({ channel: socket.channel, nick: data.nick });

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

  let record = core.muzzledHashes[badClient.hash] = {
      dumb:true
  }

  if(data.allies && Array.isArray(data.allies)){
      record.allies = data.allies;
  }

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
