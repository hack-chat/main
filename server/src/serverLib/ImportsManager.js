/**
  * Import managment base, used to load commands/protocol and configuration objects
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

const read = require('readdir-recursive');
const path = require('path');

class ImportsManager {
  /**
    * Create a `ImportsManager` instance for (re)loading classes and config
    *
    * @param {String} base executing directory name; __dirname
    */
  constructor (base) {
    this._base = base;

    this._imports = {};
  }

  /**
    * Pull base path that all imports are required in from
    *
    * @type {String} readonly
    */
  get base () {
    return this._base;
  }

  /**
    * Initialize this class and start loading target directories
    *
    */
  init () {
    let errorText = '';
    ImportsManager.load_dirs.forEach(dir => {
      errorText += this.loadDir(dir);
    });

    return errorText;
  }

  /**
    * Gather all js files from target directory, then verify and load
    *
    * @param {String} dirName The name of the dir to load, relative to the _base path.
    */
  loadDir (dirName) {
    const dir = path.resolve(this._base, dirName);

    let errorText = '';
    try {
      read.fileSync(dir).forEach(file => {
        const basename = path.basename(file);
        if (basename.startsWith('_') || !basename.endsWith('.js')) return;

        let imported;
        try {
          imported = require(file);
        } catch (e) {
          let err = `Unable to load modules from ${dirName} (${path.relative(dir, file)})\n${e}`;
          errorText += err;
          console.error(err);
          return errorText;
        }

        if (!this._imports[dirName]) {
          this._imports[dirName] = {};
        }

        this._imports[dirName][file] = imported;
      });
    } catch (e) {
      let err = `Unable to load modules from ${dirName}\n${e}`;
      errorText += err;
      console.error(err);
      return errorText;
    }

    return errorText;
  }

  /**
    * Unlink references to each loaded module, pray to google that gc knows it's job,
    * then reinitialize this class to start the reload
    *
    * @param {String} dirName The name of the dir to load, relative to the _base path.
    */
  reloadDirCache (dirName) {
    Object.keys(this._imports[dirName]).forEach((mod) => {
      delete require.cache[require.resolve(mod)];
    });

    return this.init();
  }

  /**
    * Pull reference to imported modules that were imported from dirName, or
    * load required directory if not found
    *
    * @param {String} dirName The name of the dir to load, relative to the _base path.
    */
  getImport (dirName) {
    let imported = this._imports[dirName];

    if (!imported) {
      this.loadDir(dirName);
    }

    return Object.assign({}, this._imports[dirName]);
  }
}

// automagically loaded directorys on instantiation
ImportsManager.load_dirs = ['src/commands'];

module.exports = ImportsManager;
