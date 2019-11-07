/*
  Description: Outputs the current command module list or command categories
*/

// module main
export async function run(core, server, socket, payload) {
  // check for spam
  if (server.police.frisk(socket.address, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.',
    }, socket);
  }

  // verify user input
  if (typeof payload.command !== 'undefined' && typeof payload.command !== 'string') {
    return true;
  }

  let reply = '';
  if (typeof payload.command === 'undefined') {
    reply += '# All commands:\n|Category:|Name:|\n|---:|---|\n';

    const categories = core.commands.categoriesList.sort();
    for (let i = 0, j = categories.length; i < j; i += 1) {
      reply += `|${categories[i].replace('../src/commands/', '').replace(/^\w/, (c) => c.toUpperCase())}:|`;
      const catCommands = core.commands.all(categories[i]).sort((a, b) => a.info.name.localeCompare(b.info.name));
      reply += `${catCommands.map((c) => `${c.info.name}`).join(', ')}|\n`;
    }

    reply += '---\nFor specific help on certain commands, use either:\nText: `/help <command name>`\nAPI: `{cmd: \'help\', command: \'<command name>\'}`';
  } else {
    const command = core.commands.get(payload.command);

    if (typeof command === 'undefined') {
      reply += 'Unknown command';
    } else {
      reply += `# ${command.info.name} command:\n| | |\n|---:|---|\n`;
      reply += `|**Name:**|${command.info.name}|\n`;
      reply += `|**Aliases:**|${typeof command.info.aliases !== 'undefined' ? command.info.aliases.join(', ') : 'None'}|\n`;
      reply += `|**Category:**|${command.info.category.replace('../src/commands/', '').replace(/^\w/, (c) => c.toUpperCase())}|\n`;
      reply += `|**Required Parameters:**|${command.requiredData || 'None'}|\n`;
      reply += `|**Description:**|${command.info.description || '¯\_(ツ)_/¯'}|\n\n`;
      reply += `**Usage:** ${command.info.usage || command.info.name}`;
    }
  }

  // output reply
  server.reply({
    cmd: 'info',
    text: reply,
  }, socket);

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.helpCheck.bind(this), 28);
}

// hooks chat commands checking for /whisper
export function helpCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/help')) {
    const input = payload.text.substr(1).split(' ', 2);

    this.run(core, server, socket, {
      cmd: input[0],
      command: input[1],
    });

    return false;
  }

  return payload;
}

export const info = {
  name: 'help',
  description: 'Outputs information about the servers current protocol',
  usage: `
    API: { cmd: 'help', command: '<optional command name>' }
    Text: /help <optional command name>`,
};
