import {
  Server as WsServer,
  OPEN as SocketReady,
} from 'ws';
import { createHash } from 'crypto';
import RateLimiter from './RateLimiter';

import { ServerConst } from '../utility/Constants';

/**
  * Main websocket server handling communications and connection events
  * @property {RateLimiter} police - Main rate limit handler
  * @property {String} cmdKey - Internal use command key
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */
class MainServer extends WsServer {
  /**
    * Create a HackChat server instance
    * @param {CoreApp} core Reference to the global core object
    */
  constructor(core) {
    super({ port: core.config.websocketPort });

    /**
      * Stored reference to the core
      * @type {CoreApp}
      */
    this.core = core;

    /**
      * Command key used to verify internal commands
      * @type {String}
      */
    this.internalCmdKey = [...Array(Math.floor(Math.random() * 128) + 128)].map(() => (~~(Math.random() * 36)).toString(36)).join('');

    /**
      * Salt used to hash a clients ip
      * @type {String}
      */
    this.ipSalt = [...Array(Math.floor(Math.random() * 128) + 128)].map(() => (~~(Math.random() * 36)).toString(36)).join('');

    /**
      * Data store for command hooks
      * @type {Object}
      */
    this.hooks = {};

    /**
      * Main rate limit tracker
      * @type {RateLimiter}
      */
    this.police = new RateLimiter();

    /**
      * Black listed command names
      * @type {Object}
      */
    this.cmdBlacklist = {};

    /**
      * Stored info about the last server error
      * @type {ErrorEvent}
      */
    this.lastErr = null;

    this.setupServer();
    this.loadHooks();
  }

  /**
    * Internal command key getter. Used to verify that internal only commands
    * originate internally and not from a connected client
    * @todo Update to a structure that cannot be passed through json
    * @type {String}
    * @public
    * @readonly
    */
  get cmdKey() {
    return this.internalCmdKey;
  }

  /**
    * Create ping interval and setup server event listeners
    * @private
    * @return {void}
    */
  setupServer() {
    this.heartBeat = setInterval(() => this.beatHeart(), ServerConst.PulseSpeed);

    this.on('error', (err) => {
      this.handleError(err);
    });

    this.on('connection', (socket, request) => {
      this.newConnection(socket, request);
    });
  }

  /**
    * Send empty `ping` frame to each client
    * @private
    * @return {void}
    */
  beatHeart() {
    const targetSockets = this.findSockets({});

    if (targetSockets.length === 0) {
      return;
    }

    for (let i = 0, l = targetSockets.length; i < l; i += 1) {
      try {
        if (targetSockets[i].readyState === SocketReady) {
          targetSockets[i].ping();
        }
      } catch (e) { /* yolo */ }
    }
  }

  /**
    * Bind listeners for the new socket created on connection to this class
    * @param {ws#WebSocket} socket New socket object
    * @param {Object} request Initial headers of the new connection
    * @private
    * @return {void}
    */
  newConnection(socket, request) {
    const newSocket = socket;

    newSocket.address = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

    newSocket.on('message', (data) => {
      this.handleData(socket, data);
    });

    newSocket.on('close', () => {
      this.handleClose(socket);
    });

    newSocket.on('error', (err) => {
      this.handleError(err);
    });
  }

  /**
    * Handle incoming messages from clients, parse and check command, then hand-off
    * @param {ws#WebSocket} socket Calling socket object
    * @param {String} data Message sent from client
    * @private
    * @return {void}
    */
  handleData(socket, data) {
    // Don't penalize yet, but check whether IP is rate-limited
    if (this.police.frisk(socket.address, 0)) {
      this.core.commands.handleCommand(this, socket, {
        cmd: 'socketreply',
        cmdKey: this.cmdKey,
        text: 'You are being rate-limited or blocked.',
      });

      return;
    }

    // Penalize here, but don't do anything about it
    this.police.frisk(socket.address, 1);

    // Ignore ridiculously large packets
    if (data.length > 65536) {
      return;
    }

    // Start sent data verification
    let payload = null;
    try {
      payload = JSON.parse(data);
    } catch (e) {
      // Client sent malformed json, gtfo
      socket.close();
    }

    if (payload === null) {
      return;
    }

    /**
      * @todo make the following more flexible
      * Issue #1: hard coded `cmd` check
      * Issue #2: hard coded `cmd` value checks
      */
    if (typeof payload.cmd === 'undefined') {
      return;
    }

    if (typeof payload.cmd !== 'string') {
      return;
    }

    if (typeof socket.channel === 'undefined' && (payload.cmd !== 'join' && payload.cmd !== 'chat')) {
      return;
    }

    if (typeof this.cmdBlacklist[payload.cmd] === 'function') {
      return;
    }
    // End @todo //

    // Execute `in` (incoming data) hooks and process results
    payload = this.executeHooks('in', socket, payload);

    if (typeof payload === 'string') {
      // A hook malfunctioned, reply with error
      this.core.commands.handleCommand(this, socket, {
        cmd: 'socketreply',
        cmdKey: this.cmdKey,
        text: payload,
      });

      return;
    } if (payload === false) {
      // A hook requested this data be dropped
      return;
    }

    // Finished verification & hooks, pass to command modules
    this.core.commands.handleCommand(this, socket, payload);
  }

  /**
    * Pass socket close event to disconnection command module
    * @param {ws#WebSocket} socket Closing socket object
    * @private
    * @return {void}
    */
  handleClose(socket) {
    this.core.commands.handleCommand(this, socket, {
      cmd: 'disconnect',
      cmdKey: this.cmdKey,
    });
  }

  /**
    * "Handle" server or socket errors
    * @param {ErrorEvent} err The sad stuff
    * @private
    * @return {void}
    */
  handleError(err) {
    this.lastErr = err;
    console.log(`Server error: ${err}`);
  }

  /**
    * Send data payload to specific socket/client
    * @param {Object} payload Object to convert to json for transmission
    * @param {ws#WebSocket} socket The target client
    * @example
    * server.send({
      *   cmd: 'info',
      *   text: 'Only targetSocket will see this'
      * }, targetSocket);
    * @public
    * @return {void}
    */
  send(payload, socket) {
    let outgoingPayload = payload;

    // Add timestamp to command
    outgoingPayload.time = Date.now();

    // Execute `in` (incoming data) hooks and process results
    outgoingPayload = this.executeHooks('out', socket, outgoingPayload);

    if (typeof outgoingPayload === 'string') {
      // A hook malfunctioned, reply with error
      this.core.commands.handleCommand(this, socket, {
        cmd: 'socketreply',
        cmdKey: this.cmdKey,
        text: outgoingPayload,
      });

      return;
    } if (outgoingPayload === false) {
      // A hook requested this data be dropped
      return;
    }

    try {
      if (socket.readyState === SocketReady) {
        socket.send(JSON.stringify(outgoingPayload));
      }
    } catch (e) { /* yolo */ }
  }

  /**
    * Overload function for `this.send()`
    * @param {Object} payload Object to convert to json for transmission
    * @param {ws#WebSocket} socket The target client
    * @example
    * server.reply({
      *   cmd: 'info',
      *   text: 'Only targetSocket will see this'
      * }, targetSocket);
    * @public
    * @return {void}
    */
  reply(payload, socket) {
    this.send(payload, socket);
  }

  /**
    * Finds sockets/clients that meet the filter requirements, then passes the data to them
    * @param {Object} payload Object to convert to json for transmission
    * @param {Object} filter see `this.findSockets()`
    * @example
    * server.broadcast({
    *   cmd: 'info',
    *   text: 'Everyone in "programming" will see this'
    * }, { channel: 'programming' });
    * @public
    * @return {Boolean} False if no clients matched the filter, true if data sent
    */
  broadcast(payload, filter) {
    const targetSockets = this.findSockets(filter);

    if (targetSockets.length === 0) {
      return false;
    }

    for (let i = 0, l = targetSockets.length; i < l; i += 1) {
      this.send(payload, targetSockets[i]);
    }

    return true;
  }

  /**
    * Finds sockets/clients that meet the filter requirements, returns result as array
    * @param {Object} data Object to convert to json for transmission
    * @param {Object} filter The socket must of equal or greater attribs matching `filter`
    * @example
    * // match all sockets:
    * `filter` = {}
    * // match any socket where socket.channel === 'programming'
    * `filter` = { channel: 'programming' }
    * // match any socket where
    * // socket.channel === 'programming' && socket.nick === 'Marzavec'
    * `filter` = { channel: 'programming', nick: 'Marzavec' }
    * @public
    * @return {Array} Clients who matched the filter requirements
    */
  findSockets(filter) {
    const filterAttribs = Object.keys(filter);
    const reqCount = filterAttribs.length;
    let curMatch;
    const matches = [];
    this.clients.forEach((socket) => {
    // for (const socket of this.clients) {
      curMatch = 0;

      for (let i = 0; i < reqCount; i += 1) {
        if (typeof socket[filterAttribs[i]] !== 'undefined') {
          switch (typeof filter[filterAttribs[i]]) {
            case 'object': {
              if (Array.isArray(filter[filterAttribs[i]])) {
                if (filter[filterAttribs[i]].indexOf(socket[filterAttribs[i]]) !== -1) {
                  curMatch += 1;
                }
              } else if (socket[filterAttribs[i]] === filter[filterAttribs[i]]) {
                curMatch += 1;
              }
              break;
            }

            case 'function': {
              if (filter[filterAttribs[i]](socket[filterAttribs[i]])) {
                curMatch += 1;
              }
              break;
            }

            default: {
              if (socket[filterAttribs[i]] === filter[filterAttribs[i]]) {
                curMatch += 1;
              }
              break;
            }
          }
        }
      }

      if (curMatch === reqCount) {
        matches.push(socket);
      }
    });

    return matches;
  }

  /**
    * Hashes target socket's remote address using non-static variable length salt
    * encodes and shortens the output, returns that value
    * @param {(ws#WebSocket|String)} target Either the target socket or ip as string
    * @example
    * let userHash = server.getSocketHash('1.2.3.4');
    * let userHash = server.getSocketHash(client);
    * @public
    * @return {String} Hashed client connection string
    */
  getSocketHash(target) {
    const sha = createHash('sha256');

    if (typeof target === 'string') {
      sha.update(target + this.ipSalt);
    } else {
      sha.update(target.address + this.ipSalt);
    }

    return sha.digest('base64').substr(0, 15);
  }

  /**
    * (Re)loads all command module hooks, then sorts their order of operation by
    * priority, ascending (0 being highest priority)
    * @public
    * @return {void}
    */
  loadHooks() {
    // clear current hooks (if any)
    this.clearHooks();
    // notify each module to register their hooks (if any)
    this.core.commands.initCommandHooks(this);

    let curHooks = [];
    let hookObj = [];

    if (typeof this.hooks.in !== 'undefined') {
      // start sorting, with incoming first
      curHooks = [...this.hooks.in.keys()];
      for (let i = 0, j = curHooks.length; i < j; i += 1) {
        hookObj = this.hooks.in.get(curHooks[i]);
        hookObj.sort((h1, h2) => h1.priority - h2.priority);
        this.hooks.in.set(hookObj);
      }
    }

    if (typeof this.hooks.out !== 'undefined') {
      // then outgoing
      curHooks = [...this.hooks.out.keys()];
      for (let i = 0, j = curHooks.length; i < j; i += 1) {
        hookObj = this.hooks.out.get(curHooks[i]);
        hookObj.sort((h1, h2) => h1.priority - h2.priority);
        this.hooks.out.set(hookObj);
      }
    }
  }

  /**
    * Adds a target function to an array of hooks. Hooks are executed either before
    * processing user input (`in`) or before sending data back to the client (`out`)
    * and allows a module to modify each payload before moving forward
    * @param {String} type The type of event, typically `in` (incoming) or `out` (outgoing)
    * @param {String} command Should match the desired `cmd` attrib of the payload
    * @param {Function} hookFunction Target function to execute, should accept
    *   `server`, `socket` and `payload` as parameters
    * @param {Number} priority Execution priority, hooks with priority 1 will be executed before
    *   hooks with priority 200 for example
    * @example
    * // Create hook to add "and stuff" to every chat line
    * server.registerHook('in', 'chat', (server, socket, payload) => payload.text += ' and stuff');
    * @public
    * @return {void}
    */
  registerHook(type, command, hookFunction, priority = 25) {
    if (typeof this.hooks[type] === 'undefined') {
      this.hooks[type] = new Map();
    }

    if (!this.hooks[type].has(command)) {
      this.hooks[type].set(command, []);
    }

    this.hooks[type].get(command).push({
      run: hookFunction,
      priority,
    });
  }

  /**
    * Loops through registered hooks & processes the results. Returned data will
    * be one of three possiblities:
    * A payload (modified or not) that will continue through the data flow
    * A boolean false to indicate halting the data through flow
    * A string which indicates an error occured in executing the hook
    * @param {String} type The type of event, typically `in` (incoming) or `out` (outgoing)
    * @param {ws#WebSocket} socket Either target client or client (depends on `type`)
    * @param {Object} payload Either incoming data from client or outgoing data (depends on `type`)
    * @public
    * @return {Object|Boolean}
    */
  executeHooks(type, socket, payload) {
    const command = payload.cmd;
    let newPayload = payload;

    if (typeof this.hooks[type] !== 'undefined') {
      if (this.hooks[type].has(command)) {
        const hooks = this.hooks[type].get(command);

        for (let i = 0, j = hooks.length; i < j; i += 1) {
          try {
            newPayload = hooks[i].run(this.core, this, socket, newPayload);
          } catch (err) {
            const errText = `Hook failure, '${type}', '${command}': `;
            if (this.core.config.logErrDetailed === true) {
              console.log(errText + err.stack);
            } else {
              console.log(errText + err.toString());
            }
            return errText + err.toString();
          }

          // A hook function may choose to return false to prevent all further processing
          if (newPayload === false) {
            return false;
          }
        }
      }
    }

    return newPayload;
  }

  /**
    * Wipe server hooks to make ready for module reload calls
    * @public
    * @return {void}
    */
  clearHooks() {
    this.hooks = {};
  }
}

export default MainServer;
