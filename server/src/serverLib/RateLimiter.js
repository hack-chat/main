import { RateLimits } from '../utility/Constants';

/**
  * Tracks frequency of occurances based on `id` (remote address), then allows or
  * denies command execution based on comparison with `threshold`
  * @property {Object} data - The current stats data
  * @author Marzavec ( https://github.com/marzavec )
  * @author Andrew Belt ( https://github.com/AndrewBelt )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class RateLimiter {
  /**
    * Create a ratelimiter instance
    */
  constructor() {
    /**
      * Data holder rate limit records
      * @type {Object}
      */
    this.records = {};

    /**
      * Time in milliseconds to decrement ratelimit weight
      * @type {Number}
      */
    this.halflife = RateLimits.halflife;

    /**
      * Weight until ratelimited
      * @type {Number}
      */
    this.threshold = RateLimits.threshold;

    /**
      * Stores the associated connection fingerprint with record id
      * @type {Array}
      */
    this.hashes = [];
  }

  /**
    * Finds current score by `id`
    * @param {String} id target id / address
    * @private
    * @return {Object} Object containing the record meta
    */
  search(id) {
    let record = this.records[id];

    if (!record) {
      this.records[id] = {
        time: Date.now(),
        score: 0,
      };

      record = this.records[id];
    }

    return record;
  }

  /**
    * Adjusts the current ratelimit score by `deltaScore`
    * @param {String} id target id / address
    * @param {Number} deltaScore amount to adjust current score by
    * @example
    * // Penalize by 1 and store if connection is ratelimited or not
    * let isLimited = police.frisk(socket.address, 1);
    * @public
    * @return {Boolean} True if record threshold has been exceeded
    */
  frisk(id, deltaScore) {
    const record = this.search(id);

    if (record.arrested) {
      return true;
    }

    record.score *= Math.pow(2, -(Date.now() - record.time) / this.halflife);
    record.score += deltaScore;
    record.time = Date.now();

    if (record.score >= this.threshold) {
      return true;
    }

    return false;
  }

  /**
    * Statically set server to no longer accept traffic from `id`
    * @param {String} id target id / address
    * @example
    * // Usage within a command module:
    * let badClient = server.findSockets({ channel: socket.channel, nick: targetNick });
    * server.police.arrest(badClient[0].address, badClient[0].hash);
    * @public
    * @return {void}
    */
  arrest(id, hash) {
    const record = this.search(id);

    record.arrested = true;
    this.hashes[hash] = id;
  }

  /**
    * Remove statically assigned limit from `id`
    * @param {String} id target id / address
    * @example
    * // Usage within a command module:
    * server.police.pardon('targetHashOrIP');
    * @public
    * @return {void}
    */
  pardon(id) {
    let targetId = id;
    if (typeof this.hashes[targetId] !== 'undefined') {
      targetId = this.hashes[targetId];
    }

    const record = this.search(targetId);
    record.arrested = false;
  }

  /**
    * Clear all records
    * @public
    * @return {void}
    */
  clear() {
    this.records = {};
    this.hashes = [];
  }
}

export default RateLimiter;
