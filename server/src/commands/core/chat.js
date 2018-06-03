/*
  Description: Rebroadcasts any `text` to all clients in a `channel`
*/

const parseText = (text) => {
  if (typeof text !== 'string') {
    return false;
  }

  // strip newlines from beginning and end
  text = text.replace(/^\s*\n|^\s+$|\n\s*$/g, '');
  // replace 3+ newlines with just 2 newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
};

exports.run = async (core, server, socket, data) => {
  let text = parseText(data.text);
  if (!text) {
    // lets not send objects or empty text, yea?
    return;
  }

  let score = text.length / 83 / 4;
  if (server._police.frisk(socket.remoteAddress, score)) {
    server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.'
    }, socket);

    return;
  }

  let payload = {
    cmd: 'chat',
    nick: socket.nick,
    text: text
  };

  if (socket.uType == 'admin') {
    payload.admin = true;
  } else if (socket.uType == 'mod') {
    payload.mod = true;
  }

  if (socket.trip) {
    payload.trip = socket.trip;
  }

  // TODO: Add a more contained way for modules to interact, event hooks or something?
  if(core.muzzledHashes && core.muzzledHashes[socket.hash]){
      server.broadcast( payload, { channel: socket.channel, hash: socket.hash });
      if(core.muzzledHashes[socket.hash].allies){
          server.broadcast( payload, { channel: socket.channel, nick: core.muzzledHashes[socket.hash].allies });
      }
  } else {
      //else send it to everyone
      server.broadcast( payload, { channel: socket.channel});
  }

  core.managers.stats.increment('messages-sent');
};

exports.requiredData = ['text'];

exports.info = {
  name: 'chat',
  usage: 'chat {text}',
  description: 'Broadcasts passed `text` field to the calling users channel'
};
