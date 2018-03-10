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
const Police = require('./rateLimiter');

class server extends wsServer {
	/**
	 * Create a HackChat server instance.
	 *
	 * @param {Object} core Reference to the core server object
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
		// TODO: Rate limit here
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

		var args = null;
		try {
			args = JSON.parse(data);
		} catch (e) {
			// Client sent malformed json, gtfo
			socket.close();
		}

		if (args === null)
			return;

		if (typeof args.cmd === 'undefined' || args.cmd == 'ping')
			return;

		var cmd = args.cmd;

		if (typeof socket.channel === 'undefined' && cmd !== 'join')
			return;

		if (typeof this._cmdBlacklist[cmd] === 'function') {
			return;
		}

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
		} catch (e) {
			// TODO: Should this be added to the error log?
		}
	}

	/**
		* "Handle" server or socket errors
		*
		* @param {Object||String} socket Calling socket object, or 'server'
		* @param {String} err The sad stuff
		*/
	handleError (socket, err) {
		// Meh, yolo
		// I mean;
		// TODO: Should this be added to the error log?
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
			if (socket.readyState == 1) { // Who says statically checking port status is bad practice? Everyone? Damnit. #TODO
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
		* @param {Object} filter The socket must of equal or greater attribs matching `filter`
		*                        = {} // matches all
		*                        = { channel: 'programming' } // matches any socket where (`socket.channel` === 'programming')
		*                        = { channel: 'programming', nick: 'Marzavec' } // matches any socket where (`socket.channel` === 'programming' && `socket.nick` === 'Marzavec')
		*/
	broadcast (data, filter) {
		let filterAttribs = Object.keys(filter);
		let reqCount = filterAttribs.length;
		let curMatch;
		let sent = false;
		for ( let socket of this.clients ) {
			curMatch = 0;

			for( let i = 0; i < reqCount; i++ ) {
				if (typeof socket[filterAttribs[i]] !== 'undefined' && socket[filterAttribs[i]] === filter[filterAttribs[i]])
					curMatch++;
			}

			if (curMatch === reqCount) {
				this.send(data, socket);
				sent = true;
			}
		}

		return sent;
	}
}

module.exports = server;
