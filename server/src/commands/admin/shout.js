/*
  Description: Emmits a server-wide message as `info`
*/

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  server.broadcast( {
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