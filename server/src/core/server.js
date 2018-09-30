/**
  * Main websocket server handling communications and connection events
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

const wsServer = require('ws').Server;
const socketReady = require('ws').OPEN;
const crypto = require('crypto');
const ipSalt = [...Array(Math.floor(Math.random()*128)+128)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
const internalCmdKey = [...Array(Math.floor(Math.random()*128)+128)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
const Police = require('./rateLimiter');
const pulseSpeed = 16000; // ping all clients every X ms

class server extends wsServer {
  /**
   * Create a HackChat server instance.
   *
   * @param {Object} core Reference to the global core object
   */
  constructor (core) {
    super({ port: core.config.websocketPort });

    this._core = core;
    this._hooks = {};
    this._police = new Police();
    this._cmdBlacklist = {};
    this._cmdKey = internalCmdKey;

    this._heartBeat = setInterval(((data) => {
      this.beatHeart();
    }).bind(this), pulseSpeed);

    this.on('error', (err) => {
      this.handleError('server', err);
    });

    this.on('connection', (socket, request) => {
      this.newConnection(socket, request);
    });

    this._core.commands.initCommandHooks(this);
  }

  /**
    * Send empty `ping` frame to each client
    *
    */
  beatHeart () {
    let targetSockets = this.findSockets({});

    if (targetSockets.length === 0) {
      return;
    }

    for (let i = 0, l = targetSockets.length; i < l; i++) {
      try {
        if (targetSockets[i].readyState === socketReady) {
          targetSockets[i].ping();
        }
      } catch (e) { }
    }
  }

  /**
    * Bind listeners for the new socket created on connection to this class
    *
    * @param {Object} socket New socket object
    * @param {Object} request Initial headers of the new connection
    */
  newConnection (socket, request) {
    socket.remoteAddress = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

  	socket.on('message', ((data) => {
      this.handleData(socket, data);
    }).bind(this));

    socket.on('close', (() => {
      this.handleClose(socket);
    }).bind(this));

    socket.on('error', ((err) => {
      this.handleError(socket, err);
    }).bind(this));
  }

  /**
    * Handle incoming messages from clients, parse and check command, then hand-off
    *
    * @param {Object} socket Calling socket object
    * @param {String} data Message sent from client
    */
  handleData (socket, data) {
    // Don't penalize yet, but check whether IP is rate-limited
    if (this._police.frisk(socket.remoteAddress, 0)) {
      this._core.commands.handleCommand(this, socket, {
        cmd: 'socketreply',
        cmdKey: this._cmdKey,
        text: 'Your IP is being rate-limited or blocked.'
      });

      return;
    }

    // Penalize here, but don't do anything about it
    this._police.frisk(socket.remoteAddress, 1);

    // Ignore ridiculously large packets
    if (data.length > 65536) {
      return;
    }

    // Start sent data verification
    var payload = null;
    try {
      payload = JSON.parse(data);
    } catch (e) {
      // Client sent malformed json, gtfo
      socket.close();
    }

    if (payload === null) {
      return;
    }

    if (typeof payload.cmd === 'undefined') {
      return;
    }

    if (typeof payload.cmd !== 'string') {
      return;
    }

    if (typeof socket.channel === 'undefined' && (payload.cmd !== 'join' && payload.cmd !== 'chat')) {
      return;
    }

    if (typeof this._cmdBlacklist[payload.cmd] === 'function') {
      return;
    }

    // Execute `in` (incoming data) hooks and process results
    payload = this.executeHooks('in', socket, payload);

    if (typeof payload === 'string') {
      // A hook malfunctioned, reply with error
      this._core.commands.handleCommand(this, socket, {
        cmd: 'socketreply',
        cmdKey: this._cmdKey,
        text: payload
      });

      return;
    } else if (payload === false) {
      // A hook requested this data be dropped
      return;
    }

    // Finished verification & hooks, pass to command modules
    this._core.commands.handleCommand(this, socket, payload);
  }

  /**
    * Handle socket close from clients
    *
    * @param {Object} socket Closing socket object
    */
  handleClose (socket) {
    this._core.commands.handleCommand(this, socket, {
      cmd: 'disconnect',
      cmdKey: this._cmdKey
    });
  }

  /**
    * "Handle" server or socket errors
    *
    * @param {Object||String} socket Calling socket object, or 'server'
    * @param {String} err The sad stuff
    */
  handleError (socket, err) {
    console.log(`Server error: ${err}`);
  }

  /**
    * Send data payload to specific socket/client
    *
    * @param {Object} payload Object to convert to json for transmission
    * @param {Object} socket The target client
    */
  send (payload, socket) {
    // Add timestamp to command
    payload.time = Date.now();

    // Execute `in` (incoming data) hooks and process results
    payload = this.executeHooks('out', socket, payload);

    if (typeof payload === 'string') {
      // A hook malfunctioned, reply with error
      this._core.commands.handleCommand(this, socket, {
        cmd: 'socketreply',
        cmdKey: this._cmdKey,
        text: payload
      });

      return;
    } else if (payload === false) {
      // A hook requested this data be dropped
      return;
    }

    try {
      if (socket.readyState === socketReady) {
        socket.send(JSON.stringify(payload));
      }
    } catch (e) { }
  }

  /**
    * Overload function for `this.send()`
    *
    * @param {Object} payload Object to convert to json for transmission
    * @param {Object} socket The target client
    */
  reply (payload, socket) {
    this.send(payload, socket);
  }

  /**
    * Finds sockets/clients that meet the filter requirements, then passes the data to them
    *
    * @param {Object} payload Object to convert to json for transmission
    * @param {Object} filter see `this.findSockets()`
    */
  broadcast (payload, filter) {
    let targetSockets = this.findSockets(filter);

    if (targetSockets.length === 0) {
      return false;
    }

    for (let i = 0, l = targetSockets.length; i < l; i++) {
      this.send(payload, targetSockets[i]);
    }

    return true;
  }

  /**
    * Finds sockets/clients that meet the filter requirements, returns result as array
    *
    * @param {Object} data Object to convert to json for transmission
    * @param {Object} filter The socket must of equal or greater attribs matching `filter`
    *                        = {} // matches all
    *                        = { channel: 'programming' } // matches any socket where (`socket.channel` === 'programming')
    *                        = { channel: 'programming', nick: 'Marzavec' } // matches any socket where (`socket.channel` === 'programming' && `socket.nick` === 'Marzavec')
    */
  findSockets (filter) {
    let filterAttribs = Object.keys(filter);
    let reqCount = filterAttribs.length;
    let curMatch;
    let matches = [];
    for ( let socket of this.clients ) {
      curMatch = 0;

      for (let i = 0; i < reqCount; i++) {
        if (typeof socket[filterAttribs[i]] !== 'undefined') {
          switch(typeof filter[filterAttribs[i]]) {
            case 'object': {
              if (Array.isArray(filter[filterAttribs[i]])) {
                if (filter[filterAttribs[i]].indexOf(socket[filterAttribs[i]]) !== -1) {
                  curMatch++;
                }
              } else {
                if (socket[filterAttribs[i]] === filter[filterAttribs[i]]) {
                  curMatch++;
                }
              }
            break;
            }

            case 'function': {
              if (filter[filterAttribs[i]](socket[filterAttribs[i]])) {
                curMatch++;
              }
            break;
            }

            default: {
              if (socket[filterAttribs[i]] === filter[filterAttribs[i]]) {
                curMatch++;
              }
            break;
            }
          }
        }
      }

      if (curMatch === reqCount) {
        matches.push(socket);
      }
    }

    return matches;
  }

  /**
    * Hashes target socket's remote address using non-static variable length salt
    * encodes and shortens the output, returns that value
    *
    * @param {Object||String} target Either the target socket or ip as string
    */
  getSocketHash (target) {
    let sha = crypto.createHash('sha256');

    if (typeof target === 'string') {
      sha.update(target + ipSalt);
    } else {
      sha.update(target.remoteAddress + ipSalt);
    }

    return sha.digest('base64').substr(0, 15);
  }

  /**
    * Adds a target function to an array of hooks. Hooks are executed either before
    * processing user input (`in`) or before sending data back to the client (`out`)
    * and allows a module to modify each payload before moving forward
    *
    * @param {String} type The type of event, typically `in` (incoming) or `out` (outgoing)
    * @param {String} command Should match the desired `cmd` attrib of the payload
    * @param {Function} hookFunction Target function to execute, should accept `server`, `socket` and `payload` as parameters
    */
    // TODO: add hook priority levels
  registerHook (type, command, hookFunction) {
    if (typeof this._hooks[type] === 'undefined') {
      this._hooks[type] = new Map();
    }

    if (!this._hooks[type].has(command)) {
      this._hooks[type].set(command, []);
    }

    this._hooks[type].get(command).push(hookFunction);
  }

  /**
    * Loops through registered hooks & processes the results. Returned data will
    * be one of three possiblities:
    * A payload (modified or not) that will continue through the data flow
    * A boolean false to indicate halting the data through flow
    * A string which indicates an error occured in executing the hook
    *
    * @param {String} type The type of event, typically `in` (incoming) or `out` (outgoing)
    * @param {Object} socket Either the target client or the client triggering the hook (depending on `type`)
    * @param {Object} payload Either incoming data from client or outgoing data (depending on `type`)
    */
  executeHooks (type, socket, payload) {
    let command = payload.cmd;

    if (typeof this._hooks[type] !== 'undefined') {
      if (this._hooks[type].has(command)) {
        let hooks = this._hooks[type].get(command);

        for (let i = 0, j = hooks.length; i < j; i++) {
          try {
            payload = hooks[i](this._core, this, socket, payload);
          } catch (err) {
            let errText = `Hook failure, '${type}', '${command}': ${err}`;
            console.log(errText);
            return errText;
          }

          // A payload may choose to return false to prevent all further processing
          if (payload === false) {
            return false;
          }
        }
      }
    }

    return payload;
  }

  /**
    * Wipe server hooks to make ready for module reload calls
    */
  clearHooks () {
    this._hooks = {};
  }
}

module.exports = server;
