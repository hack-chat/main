/**
  * Main websocket server handling communications and connection events
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

'use strict';

const wsServer = require('ws').Server;
const socketReady = require('ws').OPEN;
const crypto = require('crypto');
const ipSalt = (Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, (Math.random() * 16))).repeat(16);
const Police = require('./rateLimiter');

class server extends wsServer {
  /**
   * Create a HackChat server instance.
   *
   * @param {Object} core Reference to the global core object
   */
  constructor (core) {
    super({ port: core.config.websocketPort });

    this._core = core;
    this._police = new Police();
    this._cmdBlacklist = {};

    this.on('error', (err) => {
      this.handleError('server', err);
    });

    this.on('connection', (socket, request) => {
      this.newConnection(socket, request);
    });
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
      this.reply({ cmd: 'warn', text: "Your IP is being rate-limited or blocked." }, socket);

      return;
    }

    // Penalize here, but don't do anything about it
    this._police.frisk(socket.remoteAddress, 1);

    // ignore ridiculously large packets
    if (data.length > 65536) {
      return;
    }

    // Start sent data verification
    var args = null;
    try {
      args = JSON.parse(data);
    } catch (e) {
      // Client sent malformed json, gtfo
      socket.close();
    }

    if (args === null) {
      return;
    }

    if (typeof args.cmd === 'undefined' || args.cmd == 'ping') {
      return;
    }

    if (typeof args.cmd !== 'string') {
      return;
    }

    if (typeof socket.channel === 'undefined' && args.cmd !== 'join') {
      return;
    }

    if (typeof this._cmdBlacklist[args.cmd] === 'function') {
      return;
    }

    // Finished verification, pass to command modules
    this._core.commands.handleCommand(this, socket, args);
  }

  /**
    * Handle socket close from clients
    *
    * @param {Object} socket Closing socket object
    */
  handleClose (socket) {
    try {
      if (socket.channel) {
        this.broadcast({
          cmd: 'onlineRemove',
          nick: socket.nick
        }, { channel: socket.channel });
      }
    } catch (err) {
      console.log(`Server, handle close event error: ${err}`);
    }
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
    * @param {Object} data Object to convert to json for transmission
    * @param {Object} socket The target client
    */
  send (data, socket) {
    // Add timestamp to command
    data.time = Date.now();

    try {
      if (socket.readyState === socketReady) {
        socket.send(JSON.stringify(data));
      }
    } catch (e) { }
  }

  /**
    * Overload function for `this.send()`
    *
    * @param {Object} data Object to convert to json for transmission
    * @param {Object} socket The target client
    */
  reply (data, socket) {
    this.send(data, socket);
  }

  /**
    * Finds sockets/clients that meet the filter requirements, then passes the data to them
    *
    * @param {Object} data Object to convert to json for transmission
    * @param {Object} filter see `this.findSockets()`
    */
  broadcast (data, filter) {
    let targetSockets = this.findSockets(filter);

    if (targetSockets.length === 0) {
      return false;
    }

    for (let i = 0, l = targetSockets.length; i < l; i++) {
      this.send(data, targetSockets[i]);
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

      for( let i = 0; i < reqCount; i++ ) {
        if (typeof socket[filterAttribs[i]] !== 'undefined' && socket[filterAttribs[i]] === filter[filterAttribs[i]])
          curMatch++;
      }

      if (curMatch === reqCount) {
        matches.push(socket);
      }
    }

    return matches;
  }

  /**
    * Encrypts target socket's remote address using non-static variable length salt
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
}

module.exports = server;
