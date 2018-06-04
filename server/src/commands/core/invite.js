/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

exports.run = async (core, server, socket, data) => {
  // check for spam
  if (server._police.frisk(socket.remoteAddress, 2)) {
    server.reply({
      cmd: 'warn',
      text: 'You are sending invites too fast. Wait a moment before trying again.'
    }, socket);

    return;
  }

  // verify user input
  if (typeof data.nick !== 'string' || !verifyNickname(data.nick)) {
    return;
  }

  // why would you invite yourself?
  if (data.nick == socket.nick) {
    return;
  }

  // generate common channel
  let channel = Math.random().toString(36).substr(2, 8);

  // build and send invite
  let payload = {
    cmd: 'info',
    invite: channel,
    text: `${socket.nick} invited you to ?${channel}`
  };
  let inviteSent = server.broadcast( payload, { channel: socket.channel, nick: data.nick });

  // server indicates the user was not found
  if (!inviteSent) {
    server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel'
    }, socket);

    return;
  }

  // reply with common channel
  server.reply({
    cmd: 'info',
    text: `You invited ${data.nick} to ?${channel}`
  }, socket);

  // stats are fun
  core.managers.stats.increment('invites-sent');
};

exports.requiredData = ['nick'];

exports.info = {
  name: 'invite',
  usage: 'invite {nick}',
  description: 'Generates a unique (more or less) room name and passes it to two clients'
};
