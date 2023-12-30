/* eslint no-empty-function: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Legacy support module
  * @version 1.0.0
  * @description This module is only in place to supress error notices legacy clients may get
  * @module ping
  */

/**
  * Executes when invoked by a remote client
  * @public
  * @return {void}
  */
export async function run() { }

/**
  * Module meta information
  * @public
  * @typedef {Object} ping/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'ping',
  category: 'core',
  description: 'This module is only in place to supress error notices legacy clients may get',
  usage: 'none',
};
