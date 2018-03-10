/*

*/

'use strict';

exports.run = async (core, server, socket, data) => {
  let reply = `Help usage: { cmd: 'help', type: 'categories'} or { cmd: 'help', type: 'commandname'}`;

  if (typeof data.type === 'undefined') {
    //
  } else {
    if (data.type == 'categories') {
      let categories = core.commands.categories();
      // TODO: bad output, fix this
      reply = `Command Categories:\n${categories}`;
    } else {
      // TODO: finish this module later
    }
  }

  server.reply({
    cmd: 'info',
    text: reply
  }, socket);
};

// optional parameters are marked, all others are required
exports.info = {
  name: 'help', // actual command name
  usage: 'help ([type:categories] | [type:command])',
  description: 'Outputs information about the servers current protocol'
};
