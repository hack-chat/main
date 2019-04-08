/*
 * Description: Make a user (spammer) dumb (mute)
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
    return server.police.frisk(socket.remoteAddress, 10);
  }

  // check user input
  if (typeof data.nick !== 'string') {
    return;
  }

  // find target user
  let badClient = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClient.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);
  }

  badClient = badClient[0];

  // likely dont need this, muting mods and admins is fine
  if (badClient.uType !== 'user') {
    return server.reply({
      cmd: 'warn',
      text: 'This trick wont work on mods and admin'
    }, socket);
  }

  // store hash in mute list
  let record = core.muzzledHashes[badClient.hash] = {
      dumb: true
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
};

// module hook functions
exports.initHooks = (server) => {
  server.registerHook('in', 'chat', this.chatCheck, 25);
  server.registerHook('in', 'invite', this.inviteCheck, 25);
  // TODO: add whisper hook, need hook priorities todo finished first
};

// hook incoming chat commands, shadow-prevent chat if they are muzzled
exports.chatCheck = (core, server, socket, payload) => {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if(core.muzzledHashes[socket.hash]){
    // build fake chat payload
    mutedPayload = {
      cmd: 'chat',
      nick: socket.nick,
      text: payload.text
    };

    if (socket.trip) {
      mutedPayload.trip = socket.trip;
    }

    // broadcast to any duplicate connections in channel
    server.broadcast( mutedPayload, { channel: socket.channel, hash: socket.hash });

    // broadcast to allies, if any
    if(core.muzzledHashes[socket.hash].allies){
      server.broadcast( mutedPayload, { channel: socket.channel, nick: core.muzzledHashes[socket.hash].allies });
    }

    // blanket "spam" protection, may expose the ratelimiting lines from `chat` and use that, TODO: one day #lazydev
    server.police.frisk(socket.remoteAddress, 9);

    return false;
  }

  return payload;
};

// shadow-prevent all invites from muzzled users
exports.inviteCheck = (core, server, socket, payload) => {
  if (typeof payload.nick !== 'string') {
    return false;
  }

  if(core.muzzledHashes[socket.hash]){
    // generate common channel
    let channel = Math.random().toString(36).substr(2, 8);

    // send fake reply
    server.reply({
      cmd: 'info',
      text: `You invited ${payload.nick} to ?${channel}`
    }, socket);

    return false;
  }

  return payload;
};

// module meta
exports.requiredData = ['nick'];
exports.info = {
  name: 'dumb',
  description: 'Globally shadow mute a connection. Optional allies array will see muted messages.',
  usage: `
    API: { cmd: 'dumb', nick: '<target nick>', allies: ['<optional nick array>', ...] }`
};
exports.info.aliases = ['muzzle', 'mute'];
