/**
  * Commands / protocol manager- loads, validates and handles command execution
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

const path = require('path');
const didYouMean = require('didyoumean2').default;

// default command modules path
const CmdDir = 'src/commands';

class CommandManager {
  /**
    * Create a `CommandManager` instance for handling commands/protocol
    *
    * @param {Object} core Reference to the global core object
    */
  constructor (core) {
    this.core = core;
    this.commands = [];
    this.categories = [];
  }

  /**
    * (Re)initializes name spaces for commands and starts load routine
    *
    * @return {String} Module errors or empty if none
    */
  loadCommands () {
    this.commands = [];
    this.categories = [];

    const commandImports = this.core.dynamicImports.getImport(CmdDir);
    let cmdErrors = '';
    Object.keys(commandImports).forEach(file => {
      let command = commandImports[file];
      let name = path.basename(file);
      cmdErrors += this.validateAndLoad(command, file, name);
    });

    return cmdErrors;
  }

  /**
    * Checks the module after having been `require()`ed in and reports errors
    *
    * @param {Object} command reference to the newly loaded object
    * @param {String} file file path to the module
    * @param {String} name command (`cmd`) name
    *
    * @return {String} Module errors or empty if none
    */
  validateAndLoad (command, file, name) {
    let error = this.validateCommand(command);

    if (error) {
      let errText = `Failed to load '${name}': ${error}`;
      console.log(errText);
      return errText;
    }

    if (!command.category) {
      let base = path.join(this.core.dynamicImports.base, 'commands');

      let category = 'Uncategorized';
      if (file.indexOf(path.sep) > -1) {
        category = path.dirname(path.relative(base, file))
          .replace(new RegExp(path.sep.replace('\\', '\\\\'), 'g'), '/');
      }

      command.info.category = category;

      if (this.categories.indexOf(category) === -1) {
        this.categories.push(category);
      }
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

    this.commands.push(command);

    return '';
  }

  /**
    * Checks the module after having been `require()`ed in and reports errors
    *
    * @param {Object} object reference to the newly loaded object
    *
    * @return {String} Module errors or null if none
    */
  validateCommand (object) {
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
    * @param {String} category [Optional] filter return results by this category
    *
    * @return {Array} Array of command modules matching the category
    */
  all (category) {
    return !category ? this.commands : this.commands.filter(
        c => c.info.category.toLowerCase() === category.toLowerCase()
      );
  }

  /**
    * Pulls all category names
    *
    * @return {Array} Array of sub directories under CmdDir
    */
  get categoriesList () {
    return this.categories;
  }

  /**
    * Pulls command by name or alia(s)
    *
    * @param {String} name name or alias of command
    *
    * @return {Object} Target command module object
    */
  get (name) {
    return this.findBy('name', name)
      || this.commands.find(
        command => command.info.aliases instanceof Array &&
        command.info.aliases.indexOf(name) > -1
      );
  }

  /**
    * Pulls command by arbitrary search of the `module.info` attribute
    *
    * @param {String} key name or alias of command
    * @param {String} value name or alias of command
    *
    * @return {Object} Target command module object
    */
  findBy (key, value) {
    return this.commands.find(c => c.info[key] === value);
  }

  /**
    * Runs `initHooks` function on any modules that utilize the event
    *
    * @param {Object} server main server object
    */
  initCommandHooks (server) {
    this.commands.filter(c => typeof c.initHooks !== 'undefined').forEach(
        c => c.initHooks(server)
      );
  }

  /**
    * Finds and executes the requested command, or fails with semi-intelligent error
    *
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    *
    * @return {*} Arbitrary module return data
    */
  handleCommand (server, socket, data) {
    // Try to find command first
    let command = this.get(data.cmd);

    if (command) {
      return this.execute(command, server, socket, data);
    } else {
      // Then fail with helpful (sorta) message
      return this.handleFail(server, socket, data);
    }
  }

  /**
    * Requested command failure handler, attempts to find command and reports back
    *
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    *
    * @return {*} Arbitrary module return data
    */
  handleFail (server, socket, data) {
    const maybe = didYouMean(data.cmd, this.all().map(c => c.info.name), {
      threshold: 5,
      thresholdType: 'edit-distance'
    });

    if (maybe) {
      // Found a suggestion, pass it on to their dyslexic self
      return this.handleCommand(server, socket, {
        cmd: 'socketreply',
        cmdKey: server.cmdKey,
        text: `Command not found, did you mean: \`${maybe}\`?`
      });
    }

    // Request so mangled that I don't even. . .
    return this.handleCommand(server, socket, {
      cmd: 'socketreply',
      cmdKey: server.cmdKey,
      text: 'Unknown command'
    });
  }

  /**
    * Attempt to execute the requested command, fail if err or bad params
    *
    * @param {Object} command target command module
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    *
    * @return {*} Arbitrary module return data
    */
  async execute (command, server, socket, data) {
    if (typeof command.requiredData !== 'undefined') {
      let missing = [];
      for (let i = 0, len = command.requiredData.length; i < len; i++) {
        if (typeof data[command.requiredData[i]] === 'undefined')
          missing.push(command.requiredData[i]);
      }

      if (missing.length > 0) {
        console.log(`Failed to execute '${
            command.info.name
          }': missing required ${missing.join(', ')}\n\n`);

        this.handleCommand(server, socket, {
          cmd: 'socketreply',
          cmdKey: server.cmdKey,
          text: `Failed to execute '${
              command.info.name
            }': missing required ${missing.join(', ')}\n\n`
        });

        return null;
      }
    }

    try {
      return await command.run(this.core, server, socket, data);
    } catch (err) {
      let errText = `Failed to execute '${command.info.name}': ${err}`;
      console.log(errText);

      this.handleCommand(server, socket, {
        cmd: 'socketreply',
        cmdKey: server.cmdKey,
        text: errText
      });

      return null;
    }
  }
}

module.exports = CommandManager;
