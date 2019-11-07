/**
  * Rate limit options
  * @typedef {Object} RateLimits
  * @property {number} halflife Time in milliseconds to decrement ratelimit weight
  * @property {number} threshold Weight until ratelimited
  */
exports.RateLimits = {
  halflife: 30 * 1000,
  threshold: 25,
};

/**
  * Websocket server options
  * @typedef {Object} ServerConst
  * @property {number} PulseSpeed Time in milliseconds to ping each client
  */
exports.ServerConst = {
  PulseSpeed: 16 * 1000,
};
