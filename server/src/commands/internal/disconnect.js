/*
  Description: This module will be directly called by the server event handler
               when a socket connection is closed or lost.
*/

// module main
export async function run({ server, socket, payload }) {
  if (payload.cmdKey !== server.cmdKey) {
    // internal command attempt by client, increase rate limit chance and ignore
    return server.police.frisk(socket.address, 20);
  }

  // send leave notice to client peers
  if (socket.channel) {
    server.broadcast({
      cmd: 'onlineRemove',
      userid: socket.userid,
      nick: socket.nick, /* @legacy */
    }, { channel: socket.channel });
  }

  // commit close just in case
  socket.terminate();

  return true;
}

export const requiredData = ['cmdKey'];
export const info = {
  name: 'disconnect',
  usage: 'Internal Use Only',
  description: 'Internally used to relay `onlineRemove` event to clients',
};
