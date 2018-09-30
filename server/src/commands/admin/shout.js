/*
  Description: Emmits a server-wide message as `info`
*/

// module main
exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    return server._police.frisk(socket.remoteAddress, 20);
  }

  // send text to all channels
  server.broadcast({
    cmd: 'info',
    text: `Server Notice: ${data.text}`
  }, {});
};

// module meta
exports.requiredData = ['text'];
exports.info = {
  name: 'shout',
  description: 'Displays passed text to every client connected',
  usage: `
    API: { cmd: 'shout', text: '<shout text>' }`
};
