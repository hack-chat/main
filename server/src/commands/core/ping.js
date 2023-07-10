/*
  Description: This module is only in place to supress error notices legacy sources may get
*/

// module main
export async function run() {
  if (server.police.frisk(socket.address, 1)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are pinging too fast. Wait a moment before trying again.',
    }, socket);
  }
}

export const info = {
  name: 'ping',
  description: 'This module is only in place to supress error notices legacy sources may get',
};
