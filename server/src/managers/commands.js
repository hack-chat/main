/**
  * Commands / protocol manager- loads, validates and handles command execution
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

const path = require('path');
const chalk = require('chalk');
const didYouMean = require('didyoumean2');

class CommandManager {
  /**
    * Create a `CommandManager` instance for handling commands/protocol
    *
    * @param {Object} core Reference to the global core object
    */
  constructor (core) {
    this.core = core;
    this._commands = [];
    this._categories = [];
  }

  /**
    * (Re)initializes name spaces for commands and starts load routine
    *
    */
  loadCommands () {
    this._commands = [];
    this._categories = [];

    const core = this.core;

    const commandImports = core.managers.dynamicImports.getImport('src/commands');
    let cmdErrors = '';
    Object.keys(commandImports).forEach(file => {
      let command = commandImports[file];
      let name = path.basename(file);
      cmdErrors += this._validateAndLoad(command, file, name);
    });

    return cmdErrors;
  }

  /**
    * Checks the module after having been `require()`ed in and reports errors
    *
    * @param {Object} command reference to the newly loaded object
    * @param {String} file file path to the module
    * @param {String} name command (`cmd`) name
    */
  _validateAndLoad (command, file, name) {
    let error = this._validateCommand(command);

    if (error) {
      let errText = `Failed to load '${name}': ${error}`;
      console.log(errText);
      return errText;
    }

    if (!command.category) {
      let base = path.join(this.core.managers.dynamicImports.base, 'commands');

      let category = 'Uncategorized';
      if (file.indexOf(path.sep) > -1) {
        category = path.dirname(path.relative(base, file))
          .replace(new RegExp(path.sep.replace('\\', '\\\\'), 'g'), '/');
      }

      command.info.category = category;

      if (this._categories.indexOf(category) === -1)
        this._categories.push(category);
    }

    if (typeof command.init === 'function') {
      try {
        command.init(this.core);
      } catch (err) {
        let errText = `Failed to initialize '${name}': ${err}`;
        console.log(errText);
        return errText;
      }
    }

    this._commands.push(command);

    return '';
  }

  /**
    * Checks the module after having been `require()`ed in and reports errors
    *
    * @param {Object} object reference to the newly loaded object
    */
  _validateCommand (object) {
    if (typeof object !== 'object')
      return 'command setup is invalid';

    if (typeof object.run !== 'function')
      return 'run function is missing';

    if (typeof object.info !== 'object')
      return 'info object is missing';

    if (typeof object.info.name !== 'string')
      return 'info object is missing a valid name field';

    return null;
  }

  /**
    * Pulls all command names from a passed `category`
    *
    * @param {String} category reference to the newly loaded object
    */
  all (category) {
    return !category ? this._commands : this._commands.filter(c => c.info.category.toLowerCase() === category.toLowerCase());
  }

  /**
    * Pulls all category names
    *
    */
  categories () {
    return this._categories;
  }

  /**
    * Pulls command by name or alia(s)
    *
    * @param {String} name name or alias of command
    */
  get (name) {
    return this.findBy('name', name)
      || this._commands.find(command => command.info.aliases instanceof Array && command.info.aliases.indexOf(name) > -1);
  }

  /**
    * Pulls command by arbitrary search of the `module.info` attribute
    *
    * @param {String} key name or alias of command
    * @param {String} value name or alias of command
    */
  findBy (key, value) {
    return this._commands.find(c => c.info[key] === value);
  }

  /**
    * Finds and executes the requested command, or fails with semi-intelligent error
    *
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    */
  handleCommand (server, socket, data) {
    // Try to find command first
    let command = this.get(data.cmd);

    if (command) {
      return this.execute(command, server, socket, data);
    } else {
      // Then fail with helpful (sorta) message
      return this._handleFail(server, socket, data);
    }
  }

  /**
    * Requested command failure handler, attempts to find command and reports back
    *
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    */
  _handleFail(server, socket, data) {
    const maybe = didYouMean(data.cmd, this.all().map(c => c.info.name), {
      threshold: 5,
      thresholdType: 'edit-distance'
    });

    if (maybe) {
      // Found a suggestion, pass it on to their dyslexic self
      return server.reply({
        cmd: 'warn',
        text: `Command not found, did you mean: \`${maybe}\`?`
      }, socket);
    }

    // Request so mangled that I don't even, silently fail
    return;
  }

  /**
    * Attempt to execute the requested command, fail if err or bad params
    *
    * @param {Object} command target command module
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    */
  async execute(command, server, socket, data) {
    if (typeof command.requiredData !== 'undefined') {
      let missing = [];
      for (let i = 0, len = command.requiredData.length; i < len; i++) {
        if (typeof data[command.requiredData[i]] === 'undefined')
          missing.push(command.requiredData[i]);
      }

      if (missing.length > 0) {
        let errText = `Failed to execute '${command.info.name}': missing required ${missing.join(', ')}\n\n`;

        server.reply({
          cmd: 'warn',
          text: errText
        }, socket);

        return null;
      }
    }

    try {
      return await command.run(this.core, server, socket, data);
    } catch (err) {
      let errText = `Failed to execute '${command.info.name}': ${err}`;
      console.log(errText);

      server.reply({
        cmd: 'warn',
        text: errText
      }, socket);

      return null;
    }
  }
}

module.exports = CommandManager;
