import dateFormat from 'dateformat';
import {
  existsSync,
  ensureFileSync,
  readJsonSync,
  copySync,
  writeJSONSync,
  removeSync,
} from 'fs-extra';
import { resolve } from 'path';

/**
  * Server configuration manager, handling loading, creation, parsing and saving
  * of the main config.json file
  * @property {String} base - Base path that all imports are required in from
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class ConfigManager {
  /**
    * Create a `ConfigManager` instance for managing application settings
    * @param {String} basePath executing directory name; __dirname
    */
  constructor(basePath = __dirname) {
    /**
      * Full path to config.json file
      * @type {String}
      */
    this.configPath = resolve(basePath, 'config/config.json');

    if (!existsSync(this.configPath)) {
      ensureFileSync(this.configPath);
    }
  }

  /**
    * Loads config.json (main server config) into memory
    * @public
    * @return {(JSON|Boolean)} False if the config.json could not be loaded
    */
  async load() {
    try {
      this.config = readJsonSync(this.configPath);
    } catch (e) {
      return false;
    }

    return this.config;
  }

  /**
    * Creates backup of current config into configPath
    * @private
    * @return {String} Backed up config.json path
    */
  backup() {
    const backupPath = `${this.configPath}.${dateFormat('dd-mm-yy-HH-MM-ss')}.bak`;
    copySync(this.configPath, backupPath);

    return backupPath;
  }

  /**
    * First makes a backup of the current `config.json`, then writes current config
    * to disk
    * @public
    * @return {Boolean} False on failure
    */
  save() {
    const backupPath = this.backup();

    try {
      writeJSONSync(this.configPath, this.config, {
        // Indent with two spaces
        spaces: 2,
      });
      removeSync(backupPath);

      return true;
    } catch (err) {
      console.log(`Failed to save config file: ${err}`);

      return false;
    }
  }

  /**
    * Updates current config[`key`] with `value` then writes changes to disk
    * @param {*} key arbitrary configuration key
    * @param {*} value new value to change `key` to
    * @public
    * @return {Boolean} False on failure
    */
  set(key, value) {
    const realKey = `${key}`;
    this.config[realKey] = value;

    return this.save();
  }
}

export default ConfigManager;
