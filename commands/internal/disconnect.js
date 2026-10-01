/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Disconnection handler
  * @version 1.0.0
  * @description The server invokes this module each time a websocket connection is disconnected
  * @module disconnect
  */

import {
  socketInChannel,
} from '../utility/_Channels.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  // verify internal command key
  if (payload.cmdKey !== server.cmdKey) {
    // block unauthorized internal command execution
    return server.police.frisk(socket, 20);
  }

  // gather unique channels to notify
  const channelsToNotify = new Set(socket.channels || []);

  // notify each channel of the departure
  channelsToNotify.forEach((channel) => {
    // skip broadcast if user has another connection in the same channel
    const isDuplicate = socketInChannel(server, channel, socket);

    if (isDuplicate === false) {
      server.broadcast({
        cmd: 'onlineRemove',
        nick: socket.nick,
        userid: socket.userid,
        channel,
      }, (client) => {
        if (client.channels && client.channels.includes(channel)) {
          return true;
        }

        return false;
      });
    }
  });

  // ensure the socket is fully terminated
  socket.terminate();

  return true;
}

/**
  * The following payload properties are required to invoke this module:
  * "cmdKey"
  * @public
  * @typedef {Array} disconnect/requiredData
  */
export const requiredData = ['cmdKey'];

/**
  * Module meta information
  * @public
  * @typedef {Object} disconnect/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'disconnect',
  category: 'internal',
  description: 'Internally used to relay disconnect events to clients',
  usage: 'Internal Use Only',
};
