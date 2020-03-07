/** Manages {ChatCommand}s */
class ChatCommands {
  constructor () {
    /**
      * The trigger which activates commands.
      * @type {string}
      */
    this._trigger = '/';
    /**
      * An array of commands that are stored.
      * @type {ChatCommand[]}
      */
    this.commands = [];
  }

  /**
    * Returns the trigger. May be more than one character!
    * @return {string}
    */
  getTrigger () {
    return this._trigger;
  }

  /**
    * Adds a command to the commands list.
    * @param {ChatCommand} command
    */
  addCommand (command) {
    this.commands.push(command);
  }

  /**
    * Finds the command which should be ran.
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {Object} chatPayload
    * @return {(ChatCommand|null)}
    */
  findApplicableCommand (core, server, socket, chatPayload) {
    const commandInfo = new CommandInfo(this, chatPayload);

    for (let i = 0; i < this.commands.length; i++) {
      const command = this.commands[i];
      if (command.shouldTrigger(this, core, server, socket, commandInfo)) {
        return command;
      }
    }
    return null;
  }

  /**
    * Activates a command if one exists. If a command was ran then it returns true.
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {Object} chatPayload
    * @return {boolean}
    */
  trigger (core, server, socket, chatPayload) {
    // Don't even bother checking if there's no text.
    if (typeof chatPayload.text !== 'string') {
      return false;
    }

    const command = this.findApplicableCommand(core, server, socket, chatPayload);
    if (command !== null) {
      command.trigger(this, core, server, socket, new CommandInfo(this, chatPayload));
      return true;
    }

    return false;
  }
};

/** Information about the running command. */
class CommandInfo {
  /**
    * Information about the command when it's being ran.
    * Note: Many of these functions should only be called only as needed since there is no caching.
    * @param {ChatCommands} chatCommands The ChatCommands instance which created this.
    * @param {Object} chatPayload The original chat payload.
    */
  constructor (chatCommands, chatPayload) {
    this._chatCommands = chatCommands;
    this._chatPayload = chatPayload;
  }

  /**
    * Returns the held chat payload. Should not be modified unless you know what you're doing.
    * @return {Object}
    */
  getChatPayload () {
    return this._chatPayload;
  }

  /**
    * Returns the original text in the chat payload, if the text doesn't exist it returns an empty string.
    * @return {string}
    */
  getText () {
    return this._chatPayload.text || '';
  }

  /**
    * Returns the text split by *spaces*
    * @return {string[]}
    */
  getSplitText () {
    return this.getText().split(' ');
  }

  /**
    * Returns the name of the command (without the trigger). Lowercase.
    * Most of the time it should not return null if ran in an actual command.
    * @return {?string}
    */
  getCommandName () {
    const text = this.getSplitText();
    if (text.length === 0) {
      return null;
    }

    if (!text[0].startsWith(this._chatCommands.getTrigger())) {
      return null;
    }

    const triggerlessText = text[0]
      .slice(this._chatCommands.getTrigger().length)
      .trim()
      .toLowerCase();
    if (triggerlessText === '') {
      return null;
    }

    return triggerlessText;
  }

  /**
    * Returns the text after the /command part
    * May be an empty array.
    * @return {string[]}
    */
  getTail () {
    return this.getSplitText().slice(1).join(' ');
  }
};

/** Class for a command meant to be run in the chat */
export class ChatCommand {
  /**
    * Trigger calback which is ran when the command is activated.
    * @callback triggerCallback
    * @param {ChatCommands} chatCommands ChatCommands instance which is activating this command.
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket The websocket of the client which ran this command.
    * @param {CommandInfo} commandInfo Already parsed information about the text received.
    */


  /**
    * Create a command. This is meant to be added to a ChatCommands instance.
    * Extending this class is allowed, for customizing functions more than can be by default.
    * @param {(string|string[])} names The names which the command should respond to.
    */
  constructor (names) {
    if (typeof names === 'string') {
      names = [names];
    }

    if (!Array.isArray(names)) {
      console.error("Names was not a string or array in construction of Chat Command.");
      process.exit(1);
    }

    /**
      * The names this command responds to.
      * @type {string[]}
      */
    this.names = names;

    /**
      * The callback to be ran when the command is triggered.
      * @type {triggerCallback}
      */
    this._triggerCallback = null;

    /**
      * An array of requirements to apply before letting the command be ran.
      * These are ran *after* the command has been 'validated' (same name, etc)
      * @type {CommandRequirement[]}
      */
    this.requirements = [];
  }

  /**
    * Returns the names that this command responds to.
    * @return {string[]}
    */
  getNames () {
    return this.names;
  }

  /**
   * Adds new requirements to requirements list. Returns this command for chaining.
   * @param  {...CommandRequirement} requirements 
   */
  addRequirements (...requirements) {
    this.requirements.push(...requirements);
    return this;
  }

  /**
    * Sets the function to run when the command is triggered. Returns {ChatCommand} for chaining.
    * @param {triggerCallback} callback
    * @return {ChatCommand}
    */
  onTrigger (callback) {
    this._triggerCallback = callback;
    return this;
  }

  /**
    * Decides if it should trigger the command.
    * @param {ChatCommands} chatCommands The ChatCommands instance which is calling the function
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket Socket of client which is trying to run this command.
    * @param {CommandInfo} commandInfo Already parsed information about the text received.
    * @return {boolean}
    */
  shouldTrigger (chatCommands, core, server, socket, commandInfo) {
    return this.getNames().includes(commandInfo.getCommandName());
  }

  /**
    * Runs the trigger callback if it exists.
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {void}
    */
  trigger (chatCommands, core, server, socket, commandInfo) {
    // We've verified that this is the command, and so we check any requirements placed upon it.
    // This is checked here rather than shouldTrigger, because the requirements shouldn't let another command be ran.
    for (let i = 0; i < this.requirements.length; i++) {
      const requirement = this.requirements[i];

      if (!requirement.isValid(chatCommands, core, server, socket, commandInfo)) {
        let errorMessage = requirement.getErrorMessage(chatCommands, core, server, socket, commandInfo);
        if (errorMessage === null) {
          errorMessage = {
            cmd: 'warn',
            text: "There was an unknown error in using the command."
          };
        }

        server.reply(errorMessage, socket);
        return;
      }
    }

    if (typeof this._triggerCallback === 'function') {
      this._triggerCallback(chatCommands, core, server, socket, commandInfo);
    }
  }
};


export let Commands = new ChatCommands();