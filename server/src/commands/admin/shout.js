/*
  Description: Emmits a server-wide message as `info`
*/

exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    server._police.frisk(socket.remoteAddress, 20);

    return;
  }

  // send text to all channels
  server.broadcast({
    cmd: 'info',
    text: `Server Notice: ${data.text}`
  }, {});
};

exports.requiredData = ['text'];

exports.info = {
  name: 'shout',
  usage: 'shout {text}',
  description: 'Displays passed text to every client connected'
};
