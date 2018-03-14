/*
  Description: Outputs the current command module list or command categories
*/

'use strict';

const stripIndents = require('common-tags').stripIndents;

exports.run = async (core, server, socket, data) => {
  // verify passed arguments
  let typeDt = typeof data.type;
  let catDt = typeof data.category;
  let cmdDt = typeof data.command;
  if (typeDt !== 'undefined' && typeDt !== 'string' ) {
    return;
  } else if (catDt !== 'undefined' && catDt !== 'string' ) {
    return;
  } else if (cmdDt !== 'undefined' && cmdDt !== 'string' ) {
    return;
  }

  // set default reply
  let reply = stripIndents`Help usage:
    Show all categories -> { cmd: 'help', type: 'categories' }
    Show all commands in category -> { cmd: 'help', category: '<category name>' }
    Show specific command -> { cmd: 'help', command: '<command name>' }`;

  if (typeDt !== 'undefined') {
    let categories = core.commands.categories().sort();
    reply = `Command Categories:\n${categories.map(c => `- ${c.replace('../src/commands/', '')}`).join('\n')}`;
  } else if (catDt !== 'undefined') {
    let catCommands = core.commands.all('../src/commands/' + data.category).sort((a, b) => a.info.name.localeCompare(b.info.name));
    reply = `${data.category} commands:\n${catCommands.map(c => `- ${c.info.name}`).join('\n')}`;
  } else if (cmdDt !== 'undefined') {
    let command = core.commands.get(data.command);
    reply = stripIndents`
      Usage: ${command.info.usage || command.info.name}
      Description: ${command.info.description || '¯\_(ツ)_/¯'}`;
  }

  server.reply({
    cmd: 'info',
    text: reply
  }, socket);
};

exports.info = {
  name: 'help',
  usage: 'help ([ type:categories] | [category:<category name> | command:<command name> ])',
  description: 'Outputs information about the servers current protocol'
};
