/*
  Description: Emmits a server-wide message as `info`
*/

const name = 'shout';

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  server.broadcast({
    cmd: 'info',
    name,
    text: `Server Notice: ${data.text}`
  }, {});
};

exports.requiredData = ['text'];

exports.info = {
  name,
  usage: `${name} {text}`,
  description: 'Displays passed text to every client connected'
};