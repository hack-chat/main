/**
  * The core / global reference object
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

const path = require('path');
const {
  CommandManager,
  ConfigManager,
  ImportsManager,
  MainServer,
  StatsManager
} = require('./');

class CoreApp {
  /**
   * Create the main core instance.
   */
  constructor () {

  }

  async init () {
    await this.buildConfigManager();

    this.buildImportManager();
    this.buildCommandsManager();
    this.buildStatsManager();
    this.buildMainServer();
  }

  async buildConfigManager () {
    this.configManager = new ConfigManager(path.join(__dirname, '../..'));
    this.config = await this.configManager.load();

    if (this.config === false) {
      console.error('Missing config.json, have you run: npm run config');
      process.exit(0);
    }
  }

  buildImportManager () {
    this.dynamicImports = new ImportsManager(path.join(__dirname, '../..'));
  }

  buildCommandsManager () {
    this.commands = new CommandManager(this);
    this.commands.loadCommands();
  }

  buildStatsManager () {
    this.stats = new StatsManager(this);
    this.stats.set('start-time', process.hrtime());
  }

  buildMainServer () {
    this.server = new MainServer(this);
  }
}

module.exports = CoreApp;
