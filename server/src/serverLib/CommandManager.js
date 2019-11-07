import {
  basename,
  join,
  sep,
  dirname,
  relative,
} from 'path';
import didYouMean from 'didyoumean2';

// default command modules path
const CmdDir = 'src/commands';

/**
  * Commands / protocol manager- loads, validates and handles command execution
  * @property {Array} commands - Array of currently loaded command modules
  * @property {Array} categories - Array of command modules categories
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class CommandManager {
  /**
    * Create a `CommandManager` instance for handling commands/protocol
    *
    * @param {Object} core Reference to the global core object
    */
  constructor(core) {
    /**
      * Stored reference to the core
      * @type {CoreApp}
      */
    this.core = core;

    /**
      * Command module storage
      * @type {Array}
      */
    this.commands = [];

    /**
      * Command module category names (based off directory or module meta)
      * @type {Array}
      */
    this.categories = [];

    /**
      * Full path to config.json file
      * @type {String}
      */
    if (typeof this.core.config.logErrDetailed === 'undefined') {
      this.core.config.logErrDetailed = false;
    }
  }

  /**
    * (Re)initializes name spaces for commands and starts load routine
    * @public
    * @return {String} Module errors or empty if none
    */
  loadCommands() {
    this.commands = [];
    this.categories = [];

    const commandImports = this.core.dynamicImports.getImport(CmdDir);
    let cmdErrors = '';
    Object.keys(commandImports).forEach((file) => {
      const command = commandImports[file];
      const name = basename(file);
      cmdErrors += this.validateAndLoad(command, file, name);
    });

    return cmdErrors;
  }

  /**
    * Checks the module after having been `require()`ed in and reports errors
    * @param {Object} command reference to the newly loaded object
    * @param {String} file file path to the module
    * @param {String} name command (`cmd`) name
    * @private
    * @return {String} Module errors or empty if none
    */
  validateAndLoad(command, file, name) {
    const error = this.validateCommand(command);

    if (error) {
      const errText = `Failed to load command module '${name}': ${error}`;
      console.log(errText);
      return errText;
    }

    if (!command.category) {
      const base = join(this.core.dynamicImports.base, 'commands');

      let category = 'Uncategorized';
      if (file.indexOf(sep) > -1) {
        category = dirname(relative(base, file))
          .replace(new RegExp(sep.replace('\\', '\\\\'), 'g'), '/');
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
        const errText = `Failed to initialize '${name}': ${err}`;
        console.log(errText);
        return errText;
      }
    }

    this.commands.push(command);

    return '';
  }

  /**
    * Checks the module after having been `require()`ed in and reports errors
    * @param {Object} object reference to the newly loaded object
    * @private
    * @return {String} Module errors or null if none
    */
  validateCommand(object) {
    if (typeof object !== 'object') { return 'command setup is invalid'; }
    if (typeof object.run !== 'function') { return 'run function is missing'; }
    if (typeof object.info !== 'object') { return 'info object is missing'; }
    if (typeof object.info.name !== 'string') { return 'info object is missing a valid name field'; }

    return null;
  }

  /**
    * Pulls all command names from a passed `category`
    * @param {String} category [Optional] filter return results by this category
    * @public
    * @return {Array} Array of command modules matching the category
    */
  all(category) {
    return !category ? this.commands : this.commands.filter(
      (c) => c.info.category.toLowerCase() === category.toLowerCase(),
    );
  }

  /**
    * All category names
    * @public
    * @readonly
    * @return {Array} Array of command category names
    */
  get categoriesList() {
    return this.categories;
  }

  /**
    * Pulls command by name or alias
    * @param {String} name name or alias of command
    * @public
    * @return {Object} Target command module object
    */
  get(name) {
    return this.findBy('name', name)
      || this.commands.find(
        (command) => command.info.aliases instanceof Array
        && command.info.aliases.indexOf(name) > -1,
      );
  }

  /**
    * Pulls command by arbitrary search of the `module.info` attribute
    * @param {String} key name or alias of command
    * @param {String} value name or alias of command
    * @public
    * @return {Object} Target command module object
    */
  findBy(key, value) {
    return this.commands.find((c) => c.info[key] === value);
  }

  /**
    * Runs `initHooks` function on any modules that utilize the event
    * @private
    * @param {Object} server main server object
    */
  initCommandHooks(server) {
    this.commands.filter((c) => typeof c.initHooks !== 'undefined').forEach(
      (c) => c.initHooks(server),
    );
  }

  /**
    * Finds and executes the requested command, or fails with semi-intelligent error
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    * @public
    * @return {*} Arbitrary module return data
    */
  handleCommand(server, socket, data) {
    // Try to find command first
    const command = this.get(data.cmd);

    if (command) {
      return this.execute(command, server, socket, data);
    }

    // Then fail with helpful (sorta) message
    return this.handleFail(server, socket, data);
  }

  /**
    * Requested command failure handler, attempts to find command and reports back
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    * @private
    * @return {*} Arbitrary module return data
    */
  handleFail(server, socket, data) {
    const maybe = didYouMean(data.cmd, this.all().map((c) => c.info.name), {
      threshold: 5,
      thresholdType: 'edit-distance',
    });

    if (maybe) {
      // Found a suggestion, pass it on to their dyslexic self
      return this.handleCommand(server, socket, {
        cmd: 'socketreply',
        cmdKey: server.cmdKey,
        text: `Command not found, did you mean: \`${maybe}\`?`,
      });
    }

    // Request so mangled that I don't even. . .
    return this.handleCommand(server, socket, {
      cmd: 'socketreply',
      cmdKey: server.cmdKey,
      text: 'Unknown command',
    });
  }

  /**
    * Attempt to execute the requested command, fail if err or bad params
    * @param {Object} command target command module
    * @param {Object} server main server reference
    * @param {Object} socket calling socket reference
    * @param {Object} data command structure passed by socket (client)
    * @private
    * @return {*} Arbitrary module return data
    */
  async execute(command, server, socket, data) {
    if (typeof command.requiredData !== 'undefined') {
      const missing = [];
      for (let i = 0, len = command.requiredData.length; i < len; i += 1) {
        if (typeof data[command.requiredData[i]] === 'undefined') { missing.push(command.requiredData[i]); }
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
          }': missing required ${missing.join(', ')}\n\n`,
        });

        return null;
      }
    }

    try {
      return await command.run(this.core, server, socket, data);
    } catch (err) {
      const errText = `Failed to execute '${command.info.name}': `;

      // If we have more detail enabled, then we get the trace
      // if it isn't, or the property doesn't exist, then we'll get only the message
      if (this.core.config.logErrDetailed === true) {
        console.log(errText + err.stack);
      } else {
        console.log(errText + err.toString());
      }

      this.handleCommand(server, socket, {
        cmd: 'socketreply',
        cmdKey: server.cmdKey,
        text: errText + err.toString(),
      });

      return null;
    }
  }
}

export default CommandManager;
