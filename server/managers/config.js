/**
  * Server configuration manager, handling loading, creation, parsing and saving
  * of the main config.json file
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

const stripIndents = require('common-tags').stripIndents;
const dateFormat = require('dateformat');
const chalk = require('chalk');
const fse = require('fs-extra');
const prompt = require('prompt');
const path = require('path');
const deSync = require('deasync');

class ConfigManager {
  /**
    * Create a `ConfigManager` instance for (re)loading classes and config
    *
    * @param {Object} core reference to the global core object
    * @param {String} base executing directory name; __dirname
    * @param {Object} dynamicImports dynamic import engine reference
    */
  constructor (core, base, dynamicImports) {
    this._core = core;
    this._base = base;

    this._configPath = path.resolve(base, 'config/config.json');

    this._dynamicImports = dynamicImports;
  }

  /**
    * Pulls both core config questions along with any optional config questions,
    * used in building the initial config.json or re-building it.
    *
    * @param {Object} currentConfig an object containing current server settings, if any
    * @param {Object} optionalConfigs optional (non-core) module config
    */
  getQuestions (currentConfig, optionalConfigs) {
    // core server setup questions
    const questions = {
      properties: {
        adminName: {
          pattern: /^"?[a-zA-Z0-9_]+"?$/,
          type: 'string',
          message: 'Nicks can only contain letters, numbers and underscores',
          required: !currentConfig.adminName,
          default: currentConfig.adminName,
          before: value => value.replace(/"/g, '')
        },
        adminPass: {
          type: 'string',
          required: !currentConfig.adminPass,
          default: currentConfig.adminPass,
          hidden: true,
          replace: '*',
        },
        websocketPort: {
          type: 'number',
          required: !currentConfig.websocketPort,
          default: currentConfig.websocketPort || 6060
        },
        tripSalt: {
          type: 'string',
          required: !currentConfig.tripSalt,
          default: currentConfig.tripSalt,
          hidden: true,
          replace: '*',
        }
      }
    };

    // non-core server setup questions, for future plugin support
    Object.keys(optionalConfigs).forEach(configName => {
      const config = optionalConfigs[configName];
      const question = config.getQuestion(currentConfig, configName);

      if (!question) {
        return;
      }

      question.description = (question.description || configName) + ' (Optional)';
      questions.properties[configName] = question;
    });

    return questions;
  }

  /**
    * `load` function overload, only blocking
    *
    */
  loadSync () {
    let conf = {};
    conf = this.load();

    // trip salt is the last core config question, wait until it's been populated
    // TODO: update this to work with new plugin support
    while(conf === null || typeof conf.tripSalt === 'undefined') {
      deSync.sleep(100);
    }

    return conf;
  }

  /**
    * (Re)builds the config.json (main server config), or loads the config into mem
    * if rebuilding, process will exit- this is to allow a process manager to take over
    *
    * @param {Boolean} reconfiguring set to true by `scripts/configure.js`, will exit if true
    */
  load (reconfiguring = false) {
    if (reconfiguring || !fse.existsSync(this._configPath)) {
      // gotta have that sexy console
      console.log(stripIndents`
        ${chalk.magenta('°º¤ø,¸¸,ø¤º°`°º¤ø,¸,ø¤°º¤ø,¸¸,ø¤º°`°º¤ø,¸°º¤ø,¸¸,ø¤º°`°º¤ø')}
        ${chalk.gray('--------------(') + chalk.white(' HackChat Setup Wizard v1.0 ') + chalk.gray(')--------------')}
        ${chalk.magenta('°º¤ø,¸¸,ø¤º°`°º¤ø,¸,ø¤°º¤ø,¸¸,ø¤º°`°º¤ø,¸°º¤ø,¸¸,ø¤º°`°º¤ø')}

        For advanced setup, see the HackChat wiki at:
        ${chalk.green('https://github.com/')}

        ${chalk.white('Note:')} ${chalk.green('npm/yarn run config')} will re-run this utility.

        You will now be asked for the following:
        -     ${chalk.magenta('Admin Name')}, the initial admin username
        -     ${chalk.magenta('Admin Pass')}, the initial admin password
        -     ${chalk.magenta('      Port')}, the port for the websocket
        -     ${chalk.magenta('      Salt')}, the salt for username trip
        \u200b
      `);

      let currentConfig = this._config || {};
      if (reconfiguring && fse.existsSync(this._configPath)) {
        this._backup();
        currentConfig = fse.readJSONSync(this._configPath);
      }

      prompt.get(this.getQuestions(currentConfig, this._dynamicImports.optionalConfigs), (err, res) => {
        if (typeof res.mods === 'undefined') {
          res.mods = [];
        }

        if (err) {
          console.error(err);
          process.exit(666); // SPOOKY!
        }

        try {
          fse.outputJsonSync(this._configPath, res);
        } catch (e) {
          console.error(`Couldn't write config to ${this._configPath}\n${e.stack}`);
          if (!reconfiguring) {
            process.exit(666); // SPOOKY!
          }
        }

        console.log('Config generated! You may now start the server normally.')

        process.exit(reconfiguring ? 0 : 42);
      });

      return null;
    }

    this._config = fse.readJSONSync(this._configPath);

    return this._config;
  }

  /**
    * Creates backup of current config into _configPath
    *
    */
  _backup () {
    const backupPath = `${this._configPath}.${dateFormat('dd-mm-yy-HH-MM-ss')}.bak`;
    fse.copySync(this._configPath, backupPath);

    return backupPath;
  }

  /**
    * First makes a backup of the current `config.json`, then writes current config
    * to disk
    *
    */
  save () {
    const backupPath = this._backup();

    if (!fse.existsSync(this._configPath)){
      fse.mkdirSync(this._configPath);
    }

    try {
      fse.writeJSONSync(this._configPath, this._config);
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
  set (key, value) {
    const realKey = `${key}`;
    this._config[realKey] = value;

    this.save();
  }
}

module.exports = ConfigManager;
