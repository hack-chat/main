/**
  * Simple generic stats collection script for events occurances (etc)
  * @property {Object} data - The current stats data
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class StatsManager {
  /**
    * Create a stats instance
    */
  constructor() {
    /**
      * Data holder for the stats class
      * @type {Object}
      */
    this.data = {};
  }

  /**
    * Retrieve value of arbitrary `key` reference
    * @param {String} key Reference to the arbitrary store name
    * @example
    * // Find previously set `start-time`
    * stats.get('start-time');
    * @public
    * @return {*} Data referenced by `key`
    */
  get(key) {
    return this.data[key];
  }

  /**
    * Set value of arbitrary `key` reference
    * @param {String} key Reference to the arbitrary store name
    * @param {Number} value New value for `key`
    * @example
    * // Set `start-time`
    * stats.set('start-time', process.hrtime());
    * @public
    * @return {void}
    */
  set(key, value) {
    this.data[key] = value;
  }

  /**
    * Increase value of arbitrary `key` reference, by 1 or `amount`
    * @param {String} key Reference to the arbitrary store name
    * @param {?Number} [amount=1] Value to increase `key` by, or 1 if omitted
    * @example
    * // Increment by `amount`
    * stats.increment('users', 6);
    * // Increment by 1
    * stats.increment('users');
    * @public
    * @return {void}
    */
  increment(key, amount = 1) {
    this.set(key, (this.get(key) || 0) + amount);
  }

  /**
    * Reduce value of arbitrary `key` reference, by 1 or `amount`
    * @param {String} key Reference to the arbitrary store name
    * @param {?Number} [amount=1] Value to decrease `key` by, or 1 if omitted
    * @example
    * // Decrement by `amount`
    * stats.decrement('users', 6);
    * // Decrement by 1
    * stats.decrement('users');
    * @public
    * @return {void}
    */
  decrement(key, amount = 1) {
    this.set(key, (this.get(key) || 0) - amount);
  }
}

module.exports = StatsManager;
