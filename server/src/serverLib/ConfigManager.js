/**
  * Server configuration manager, handling loading, creation, parsing and saving
  * of the main config.json file
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */
const dateFormat = require('dateformat');
const fse = require('fs-extra');
const path = require('path');

class ConfigManager {
  /**
    * Create a `ConfigManager` instance for managing application settings
    *
    * @param {String} base executing directory name; __dirname
    */
  constructor (base = __dirname) {
    this.configPath = path.resolve(base, 'config/config.json');

    if (!fse.existsSync(this.configPath)){
      fse.ensureFileSync(this.configPath);
    }
  }

  /**
    * (Re)builds the config.json (main server config), or loads the config into mem
    * if rebuilding, process will exit- this is to allow a process manager to take over
    *
    * @param {Boolean} reconfiguring set to true by `scripts/configure.js`, will exit if true
    */
  async load () {
    try {
      this.config = fse.readJsonSync(this.configPath);
    } catch (e) {
      return false;
    }

    return this.config;
  }

  /**
    * Creates backup of current config into configPath
    *
    */
  async backup () {
    const backupPath = `${this.configPath}.${dateFormat('dd-mm-yy-HH-MM-ss')}.bak`;
    fse.copySync(this.configPath, backupPath);

    return backupPath;
  }

  /**
    * First makes a backup of the current `config.json`, then writes current config
    * to disk
    *
    */
  async save () {
    const backupPath = await this.backup();

    try {
      fse.writeJSONSync(this.configPath, this.config);
      fse.removeSync(backupPath);

      return true;
    } catch (err) {
      console.log(`Failed to save config file: ${err}`);

      return false;
    }
  }

  /**
    * Updates current config[`key`] with `value` then writes changes to disk
    *
    * @param {*} key arbitrary configuration key
    * @param {*} value new value to change `key` to
    */
  async set (key, value) {
    const realKey = `${key}`;
    this.config[realKey] = value;

    return await this.save();
  }
}

module.exports = ConfigManager;
