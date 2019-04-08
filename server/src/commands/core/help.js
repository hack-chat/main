/*
  Description: Outputs the current command module list or command categories
*/

// module support functions
const stripIndents = require('common-tags').stripIndents;

// module main
exports.run = async (core, server, socket, payload) => {
  // check for spam
  if (server.police.frisk(socket.remoteAddress, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.'
    }, socket);
  }

  // verify user input
  if (typeof payload.command !== 'undefined' && typeof payload.command !== 'string') {
    return;
  }

  let reply = '';
  if (typeof payload.command === 'undefined') {
    reply = stripIndents`Listing all current commands. For specific help on certain commands, use either:
      Text: /help <command name>
      API:  {cmd: 'help', command: '<command name>'}`;
    reply += '\n\n-------------------------------------\n\n';

    let categories = core.commands.categoriesList.sort();
    for (let i = 0, j = categories.length; i < j; i++) {
      reply += `${categories[i].replace('../src/commands/', '').replace(/^\w/, c => c.toUpperCase())} Commands:\n`;
      let catCommands = core.commands.all(categories[i]).sort((a, b) => a.info.name.localeCompare(b.info.name));
      reply += `  ${catCommands.map(c => `${c.info.name}`).join(', ')}\n\n`;
    }
  } else {
    let command = core.commands.get(payload.command);

    if (typeof command === 'undefined') {
      reply = 'Unknown command';
    } else {
      reply = stripIndents`Name: ${command.info.name}
        Aliases: ${typeof command.info.aliases !== 'undefined' ? command.info.aliases.join(', ') : 'None'}
        Category: ${command.info.category.replace('../src/commands/', '').replace(/^\w/, c => c.toUpperCase())}
        Required Parameters: ${command.requiredData || 'None'}\n
        Description: ${command.info.description || '¯\_(ツ)_/¯'}\n
        Usage: ${command.info.usage || command.info.name}`;
    }
  }

  // output reply
  server.reply({
    cmd: 'info',
    text: reply
  }, socket);
};

// module hook functions
exports.initHooks = (server) => {
  server.registerHook('in', 'chat', this.helpCheck, 28);
};

// hooks chat commands checking for /whisper
exports.helpCheck = (core, server, socket, payload) => {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/help')) {
    let input = payload.text.substr(1).split(' ', 2);

    this.run(core, server, socket, {
      cmd: input[0],
      command: input[1]
    });

    return false;
  }

  return payload;
};

// module meta
exports.info = {
  name: 'help',
  description: 'Outputs information about the servers current protocol',
  usage: `
    API: { cmd: 'help', command: '<optional command name>' }
    Text: /help <optional command name>`
};
