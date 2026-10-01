/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Disconnect a user's wallet
  * @version 1.0.0
  * @description Removes wallet session data and resets user state
  * @module disconnectwallet
  */

import {
  Info,
} from '../utility/_Constants.js';
import {
  levels,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  getChannelSettings,
} from '../utility/_Channels.js';

// format address for display
const shortenAddress = (address) => `${address.slice(0, 5)}...${address.slice(-5)}`;

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server & socket
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket,
}) {
  // check if wallet exists
  if (typeof socket.wallet === 'undefined') {
    return false;
  }

  // cache old values
  const oldAddress = socket.wallet.address;
  const oldEffect = socket.effect || 0;

  // remove wallet session data
  delete socket.wallet;
  socket.effect = 0;

  // reset channel states and levels
  if (socket.channelStates) {
    const channelNames = Object.keys(socket.channelStates);

    for (let i = 0; i < channelNames.length; i += 1) {
      const channelName = channelNames[i];
      const state = socket.channelStates[channelName];
      const currentTrip = state.trip || socket.trip || '';
      const oldLevel = state.level;
      let newLevel = levels.default;

      const channelSettings = getChannelSettings(core.appConfig.data, channelName);

      // determine base permission levels
      if (channelSettings.owned) {
        if (channelSettings.ownerTrip === currentTrip) {
          newLevel = levels.channelOwner;
        } else if (channelSettings.tripLevels && typeof channelSettings.tripLevels[currentTrip] !== 'undefined') {
          newLevel = channelSettings.tripLevels[currentTrip];
        }
      }

      // override for global mods
      if (core.appConfig.data.globalMods) {
        const isGlobalMod = core.appConfig.data.globalMods.some((m) => m.trip === currentTrip);

        if (isGlobalMod) {
          newLevel = levels.moderator;
        }
      }

      state.level = newLevel;

      // broadcast updates if state changed
      if (oldLevel !== newLevel || oldEffect !== 0) {
        const outgoingPayload = {
          ...getUserDetails(socket, channelName),
          effect: socket.effect,
          cmd: 'updateUser',
          channel: channelName,
        };

        server.broadcast(outgoingPayload, (client) => {
          if (client.channels && client.channels.includes(channelName)) {
            return true;
          }

          return false;
        });
      }
    }
  }

  // notify user across all channels
  if (socket.channels) {
    for (let i = 0; i < socket.channels.length; i += 1) {
      server.reply({
        cmd: 'info',
        text: `Wallet disconnected (${shortenAddress(oldAddress)})`,
        id: Info.Wallet.DISCONNECTED,
        args: { address: shortenAddress(oldAddress) },
        channel: socket.channels[i],
      }, socket);
    }
  }

  return true;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} disconnectwallet/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'disconnectwallet',
  category: 'wallet',
  description: 'Disconnects the currently attached Solana wallet',
  usage: `
    API: { cmd: 'disconnectwallet' }`,
};
