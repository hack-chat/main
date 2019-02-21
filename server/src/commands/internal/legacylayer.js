/*
  Description: This module adjusts outgoing data, making it compatible with legacy clients
*/

// module main
exports.run = async (core, server, socket, data) => {
  return;
};

// module hook functions
exports.initHooks = (server) => {
  // module is only a placeholder
  //server.registerHook('out', '', this.);
};

// module meta
exports.info = {
  name: 'legacylayer',
  description: 'This module adjusts outgoing data, making it compatible with legacy clients'
};
