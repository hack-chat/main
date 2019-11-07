/*
  Description: This module adjusts outgoing data, making it compatible with legacy clients
*/

// module main
export async function run(core, server, socket, data) {
  /**
    * @todo
    */
}

// module hook functions
export function initHooks(server) {
  // module is only a placeholder
  // server.registerHook('out', '', this.);
}

export const info = {
  name: 'legacylayer',
  description: 'This module adjusts outgoing data, making it compatible with legacy clients',
};
