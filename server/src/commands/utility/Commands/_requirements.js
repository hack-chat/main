export class CommandRequirement {
  /**
    * Function which is ran when the error message is needed.
    * @callback errorMessage
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {?String}
    */

  /**
   * A requirement for a command to be ran.
   * @param {errorMessage} errorMessageFunction
   */
  constructor (errorMessageFunction) {
    this._errorMessageFunction = errorMessageFunction;
  }

  /**
    * Checks if the command is valid. Returns true if it is.
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {boolean}
    */
  isValid (chatCommands, core, server, socket, commandInfo) {
    return true;
  }

  /**
    * Returns the message *payload* that should be sent to the offending client.
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {?Object}
    */
  getErrorMessage (chatCommands, core, server, socket, commandInfo) {
    if (typeof this._errorMessageFunction === 'function') {
      return {
        cmd: 'warn',
        text: this._errorMessageFunction(chatCommands, core, server, socket, commandInfo),
      };
    }
    return null;
  }
};

export class RequirementSimple extends CommandRequirement {
  /**
    * Function which is ran when the error message is needed.
    * @callback validator
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {?String}
    */

  /**
   * A simple requirement which is usually a one-off, and doesn't need to store any data.
   * @param {validator} validatorFunction 
   * @param {errorMessage} errorMessageFunction 
   */
  constructor (validatorFunction, errorMessageFunction) {
    super(errorMessageFunction);

    /**
     * Function which checks if the requirement is met.
     * @type {validator}
     */
    this._validatorFunction = validatorFunction;
  }

/**
    * Checks if the command is valid. Returns true if it is.
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {boolean}
    */
  isValid (chatCommands, core, server, socket, commandInfo) {
    if (typeof this._validatorFunction === 'function') {
      return this._validatorFunction(chatCommands, core, server, commandInfo);
    }
    return true;
  }
};

export class RequirementMinimumUACLevel extends CommandRequirement {
  /**
   * Creates a Requirement that requires a minimum UAC level.
   * @param {number} requiredLevel
   * @param {errorMessage} errorMessageFunction
   */
  constructor (requiredLevel, errorMessageFunction=(() => "You are not authorized to use this command.")) {
    super(errorMessageFunction);

    /**
     * The minimum UAC level to use the command.
     * @type {number}
     */
    this._requiredLevel = requiredLevel;
  }

  /**
    * Checks if the command is valid. Returns true if it is.
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {boolean}
    */
  isValid (chatCommands, core, server, socket, commandInfo) {
    return socket.level >= this._requiredLevel;
  }
};

export class RequirementMinimumParameterCount extends CommandRequirement {
  /**
   * Creates a Requirement that requires a minimum of (simple) parameters from the command.
   * @param {number} requiredAmount
   * @param {errorMessage} errorMessageFunction
   */
  constructor (requiredAmount, errorMessageFunction=(() => "Not enough parameters supplied to command.")) {
    super(errorMessageFunction);

    /**
     * The minimum required amount of parameters.
     * @type {number}
     */
    this._requiredAmount = requiredAmount;
  }

  /**
    * Checks if the command is valid. Returns true if it is.
    * @param {ChatCommands} chatCommands
    * @param {CoreApp} core
    * @param {MainServer} server
    * @param {WebSocket} socket
    * @param {CommandInfo} commandInfo
    * @return {boolean}
    */
  isValid (chatCommands, core, server, socket, commandInfo) {
    return (commandInfo.getSplitText().length - 1) >= this._requiredAmount;
  }
};