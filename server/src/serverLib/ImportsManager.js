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
    * @param {String} basePath executing directory name; default __dirname
    */
  constructor (basePath) {
    this.basePath = basePath;
    this.imports = {};
  }

  /**
    * Pull base path that all imports are required in from
    *
    * @type {String} readonly
    */
  get base () {
    return this.basePath;
  }

  /**
    * Gather all js files from target directory, then verify and load
    *
    * @param {String} dirName The name of the dir to load, relative to the basePath.
    *
    * @return {String} Load errors or empty if none
    */
  loadDir (dirName) {
    const dir = path.resolve(this.basePath, dirName);

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

        if (!this.imports[dirName]) {
          this.imports[dirName] = {};
        }

        this.imports[dirName][file] = imported;
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
    * @param {Array} dirName The name of the dir to load, relative to the _base path.
    *
    * @return {String} Load errors or empty if none
    */
  reloadDirCache () {
    let errorText = '';

    Object.keys(this.imports).forEach(dir => {
      Object.keys(this.imports[dir]).forEach((mod) => {
        delete require.cache[require.resolve(mod)];
      });

      errorText += this.loadDir(dir);
    });

    return errorText;
  }

  /**
    * Pull reference to imported modules that were imported from dirName, or
    * load required directory if not found
    *
    * @param {String} dirName The name of the dir to load, relative to the _base path.
    *
    * @return {Object} Object containing command module paths and structs
    */
  getImport (dirName) {
    let imported = this.imports[dirName];

    if (!imported) {
      this.loadDir(dirName);
    }

    return Object.assign({}, this.imports[dirName]);
  }
}

module.exports = ImportsManager;
