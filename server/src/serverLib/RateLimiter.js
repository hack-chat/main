/**
  * Tracks frequency of occurances based on `id` (remote address), then allows or
  * denies command execution based on comparison with `threshold`
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

class RateLimiter {
  /**
   * Create a ratelimiter instance.
   */
  constructor () {
    this.records = {};
    this.halflife = 30 * 1000; // milliseconds
    this.threshold = 25;
    this.hashes = [];
  }

  /**
    * Finds current score by `id`
    *
    * @param {String} id target id / address
    *
    * @return {Object} Object containing the record meta
    */
  search (id) {
    let record = this.records[id];

    if (!record) {
      record = this.records[id] = {
        time: Date.now(),
        score: 0
      }
    }

    return record;
  }

  /**
    * Adjusts the current ratelimit score by `deltaScore`
    *
    * @param {String} id target id / address
    * @param {Number} deltaScore amount to adjust current score by
    *
    * @return {Boolean} True if record threshold has been exceeded
    */
  frisk (id, deltaScore) {
    let record = this.search(id);

    if (record.arrested) {
      return true;
    }

    record.score *= Math.pow(2, -(Date.now() - record.time ) / this.halflife);
    record.score += deltaScore;
    record.time = Date.now();

    if (record.score >= this.threshold) {
      return true;
    }

    return false;
  }

  /**
    * Statically set server to no longer accept traffic from `id`
    *
    * @param {String} id target id / address
    */
  arrest (id, hash) {
    let record = this.search(id);

    record.arrested = true;
    this.hashes[hash] = id;
  }

  /**
    * Remove statically assigned limit from `id`
    *
    * @param {String} id target id / address
    */
  pardon (id) {
    if (typeof this.hashes[id] !== 'undefined') {
      id = this.hashes[id];
    }

    let record = this.search(id);
    record.arrested = false;
  }
}

module.exports = RateLimiter;
