import { join } from 'path';
import {
  CommandManager,
  ConfigManager,
  ImportsManager,
  MainServer,
  StatsManager,
} from '.';

/**
  * The core app builds all required classes and maintains a central
  * reference point across the app
  * @property {ConfigManager} configManager - Provides loading and saving of the server config
  * @property {Object} config - The current json config object
  * @property {ImportsManager} dynamicImports - Dynamic require interface allowing hot reloading
  * @property {CommandManager} commands - Manages and executes command modules
  * @property {StatsManager} stats - Stores and adjusts arbritary stat data
  * @property {MainServer} server - Main websocket server reference
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class CoreApp {
  /**
    * Load config then initialize children
    * @public
    * @return {void}
    */
  async init() {
    await this.buildConfigManager();

    this.buildImportManager();
    this.buildCommandsManager();
    this.buildStatsManager();
    this.buildMainServer();
  }

  /**
    * Creates a new instance of the ConfigManager, loads and checks
    * the server config
    * @private
    * @return {void}
    */
  async buildConfigManager() {
    this.configManager = new ConfigManager(join(__dirname, '../..'));
    this.config = await this.configManager.load();

    if (this.config === false) {
      console.error('Missing config.json, have you run: npm run config');
      process.exit(0);
    }
  }

  /**
    * Creates a new instance of the ImportsManager
    * @private
    * @return {void}
    */
  buildImportManager() {
    this.dynamicImports = new ImportsManager(join(__dirname, '../..'));
  }

  /**
    * Creates a new instance of the CommandManager and loads the command modules
    * @private
    * @return {void}
    */
  buildCommandsManager() {
    this.commands = new CommandManager(this);
    this.commands.loadCommands();
  }

  /**
    * Creates a new instance of the StatsManager and sets the server start time
    * @private
    * @return {void}
    */
  buildStatsManager() {
    this.stats = new StatsManager(this);
    this.stats.set('start-time', process.hrtime());
  }

  /**
    * Creates a new instance of the MainServer
    * @private
    * @return {void}
    */
  buildMainServer() {
    this.server = new MainServer(this);
  }
}

export { CoreApp };
