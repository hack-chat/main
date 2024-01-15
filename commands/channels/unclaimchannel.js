/**
  * @author Marzavec
  * @summary Release channel ownership
  * @version 1.0.0
  * @description Clear ownership info and channel settings
  * @module unclaimchannel
  */

import {
  isModerator,
  getUserDetails,
  levels,
} from '../utility/_UAC.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  getChannelSettings,
  deleteChannelSettings,
} from '../utility/_Channels.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 10);
  }

  if (!socket.trip) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to run command: Missing trip code.',
      id: Errors.Global.MISSING_TRIPCODE,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

  if (channelSettings.owned === false) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to release ownership: That which is not owned may not be unowned, and with strange aeons. . .',
      id: Errors.UnclaimChannel.NOT_OWNED,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (channelSettings.ownerTrip !== socket.trip && !isModerator(socket.level)) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to release ownership: Wrong trip code.',
      id: Errors.UnclaimChannel.FAKE_OWNER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  deleteChannelSettings(core.appConfig.data, socket.channel);

  server.broadcast({
    cmd: 'info', // @todo Add numeric info code as `id`
    text: 'Channel ownership has been removed and the channel settings have been reset',
    channel: socket.channel,
  }, { channel: socket.channel });

  const targetClients = server.findSockets({
    channel: socket.channel,
  });

  for (let i = 0, j = targetClients.length; i < j; i += 1) {
    if (!isModerator(targetClients[i].level)) {
      targetClients[i].level = levels.default;

      server.broadcast({
        ...getUserDetails(targetClients[i]),
        ...{
          cmd: 'updateUser',
          channel: socket.channel,
        },
      }, { channel: socket.channel });
    }
  }

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatHook.bind(this), 26);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/new payload, false = suppress, string = error
  */
export function chatHook({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/unclaimchannel')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'unclaimchannel',
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} unclaimchannel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'unclaimchannel',
  category: 'channels',
  description: 'Clear ownership info and channel settings',
  usage: `
  API: { cmd: 'unclaimchannel' }
  Text: /unclaimchannel`,
};
