/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Get help
  * @version 1.0.0
  * @description Outputs information about the servers current protocol
  * @module help
  */

import {
  CodebaseVersion,
  Errors,
  Info,
} from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 1);
  }

  // check for spam
  if (server.police.frisk(socket, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.',
      id: Errors.Global.RATELIMIT,
      channel: socket.channel, // @todo Multichannel
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
      const catCommands = core.commands.all(categories[i]).sort(
        (a, b) => a.info.name.localeCompare(b.info.name),
      );
      reply += `${catCommands.map((c) => `${c.info.name}`).join(', ')}|\n`;
    }

    reply += '---\nFor specific help on certain commands, use either:\nText: `/help <command name>`\nAPI: `{cmd: \'help\', command: \'<command name>\'}`';
    reply += `\n\nHackChat ${CodebaseVersion}`;
  } else {
    const command = core.commands.get(payload.command);

    if (typeof command === 'undefined') {
      reply += 'Unknown command';
    } else {
      reply += `# ${command.info.name} command:\n| | |\n|---:|---|\n`;
      reply += `|**Name:**|${command.info.name}|\n`;
      reply += `|**Hash:**|${command.info.srcHash}|\n`;
      reply += `|**Aliases:**|${typeof command.info.aliases !== 'undefined' ? command.info.aliases.join(', ') : 'None'}|\n`;
      reply += `|**Category:**|${command.info.category.replace('../src/commands/', '').replace(/^\w/, (c) => c.toUpperCase())}|\n`;
      reply += `|**Required Parameters:**|${command.requiredData || 'None'}|\n`;
      // eslint-disable-next-line no-useless-escape
      reply += `|**Description:**|${command.info.description || '¯\_(ツ)_/¯'}|\n\n`;
      reply += `**Usage:** ${command.info.usage || command.info.name}`;
    }
  }

  // output reply
  server.reply({
    cmd: 'info',
    text: reply,
    id: Info.Core.HELP_TEXT,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.helpCheck.bind(this), 28);
}

/**
  * Executes every time an incoming chat command is invoked;
  * hooks chat commands checking for /help
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function helpCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/help')) {
    const input = payload.text.substr(1).split(' ', 2);

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: input[0],
        command: input[1],
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} help/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'help',
  category: 'core',
  description: 'Outputs information about the servers current protocol',
  usage: `
    API: { cmd: 'help', command: '<optional command name>' }
    Text: /help <optional command name>`,
};
