import {
  resolve,
  basename as _basename,
  relative,
} from 'path';
import RecursiveRead from 'readdir-recursive';

/**
  * Import managment base, used to load commands/protocol and configuration objects
  * @property {String} base - Base path that all imports are required in from
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class ImportsManager {
  /**
    * Create an `ImportsManager` instance for (re)loading classes and config
    * @param {String} basePath executing directory name; default __dirname
    */
  constructor(basePath) {
    /**
      * Stored reference to the base directory path
      * @type {String}
      */
    this.basePath = basePath;

    /**
      * Data holder for imported modules
      * @type {Object}
      */
    this.imports = {};
  }

  /**
    * Pull base path that all imports are required in from
    * @public
    * @type {String} readonly
    */
  get base() {
    return this.basePath;
  }

  /**
    * Gather all js files from target directory, then verify and load
    * @param {String} dirName The name of the dir to load, relative to the basePath
    * @private
    * @return {String} Load errors or empty if none
    */
  loadDir(dirName) {
    const dir = resolve(this.basePath, dirName);

    let errorText = '';
    try {
      RecursiveRead.fileSync(dir).forEach((file) => {
        const basename = _basename(file);
        if (basename.startsWith('_') || !basename.endsWith('.js')) return;

        let imported;
        try {
          imported = require(file);

          if (!this.imports[dirName]) {
            this.imports[dirName] = {};
          }

          this.imports[dirName][file] = imported;
        } catch (e) {
          const err = `Unable to load modules from ${dirName} (${relative(dir, file)})\n${e}`;
          errorText += err;
          console.error(err);
        }
      });
    } catch (e) {
      const err = `Unable to load modules from ${dirName}\n${e}`;
      errorText += err;
      console.error(err);
      return errorText;
    }

    return errorText;
  }

  /**
    * Unlink references to each loaded module, pray to google that gc knows it's job,
    * then reinitialize this class to start the reload
    * @public
    * @return {String} Load errors or empty if none
    */
  reloadDirCache() {
    let errorText = '';

    Object.keys(this.imports).forEach((dir) => {
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
    * @param {String} dirName The name of the dir to load, relative to the _base path.
    * @public
    * @return {Object} Object containing command module paths and structs
    */
  getImport(dirName) {
    const imported = this.imports[dirName];

    if (!imported) {
      this.loadDir(dirName);
    }

    return { ...this.imports[dirName] };
  }
}

export default ImportsManager;
