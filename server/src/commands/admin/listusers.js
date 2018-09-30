/*
  Description: Outputs all current channels and their user nicks
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    return server._police.frisk(socket.remoteAddress, 20);
  }

  // find all users currently in a channel
  let currentUsers = server.findSockets({
    channel: (channel) => true
  });

  // compile channel and user list
  let channels = {};
  for (let i = 0, j = currentUsers.length; i < j; i++) {
    if (typeof channels[currentUsers[i].channel] === 'undefined') {
      channels[currentUsers[i].channel] = [];
    }
    channels[currentUsers[i].channel].push(currentUsers[i].nick);
  }

  // build output
  let lines = [];
  for (let channel in channels) {
    lines.push(`?${channel} ${channels[channel].join(", ")}`);
  }

  // send reply
  server.reply({
    cmd: 'info',
    text: lines.join("\n")
  }, socket);
};

// module meta
exports.info = {
  name: 'listusers',
  description: 'Outputs all current channels and sockets in those channels',
  usage: `
    API: { cmd: 'listusers' }`
};
