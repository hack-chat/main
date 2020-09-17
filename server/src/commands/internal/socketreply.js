/*
  Description: Used to relay warnings to clients internally
*/

// module main
export async function run({ server, socket, payload }) {
  if (payload.cmdKey !== server.cmdKey) {
    // internal command attempt by client, increase rate limit chance and ignore
    return server.police.frisk(socket.address, 20);
  }

  // send warning to target socket
  server.reply({
    cmd: 'warn', // @todo Remove english and change to numeric id
    text: payload.text,
  }, socket);

  return true;
}

export const requiredData = ['cmdKey', 'text'];
export const info = {
  name: 'socketreply',
  usage: 'Internal Use Only',
  description: 'Internally used to relay warnings to clients',
};
