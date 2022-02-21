/*
  Description: This module will be directly called by the server event handler
               when a socket connection is closed or lost.
*/

// module main
export async function run(core, server, socket, data) {
  if (data.cmdKey !== server.cmdKey) {
    // internal command attempt by client, increase rate limit chance and ignore
    return server.police.frisk(socket.address, 20);
  }

  // send leave notice to client peers
  if (socket.channel) {
    const users = server.findSockets({
      userid: socket.userid,
    });

    // TODO: We could do some shenanigans to unlink the original id if that was the one that dced
    // If there is still a user after a dc, then that means they are still on
    if (users.length > 0) {
      return false;
    }

    server.broadcast({
      cmd: 'onlineRemove',
      nick: socket.nick,
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
