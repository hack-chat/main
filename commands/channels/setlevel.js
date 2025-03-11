/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Change user level
  * @version 1.0.0
  * @description Alter the permission level a trip is allowed within current channel
  * @module setlevel
  */

import {
  levels,
  isChannelModerator,
  getUserDetails,
  getAppearance,
} from '../utility/_UAC.js';
import {
  setChannelTripLevel,
} from '../utility/_Channels.js';
import {
  Errors,
} from '../utility/_Constants.js';

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  core.levelLabels = Object.keys(levels);
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not channel mod or better
  if (!isChannelModerator(socket.level)) {
    return server.police.frisk(socket, 10);
  }

  if (typeof payload.trip !== 'string' || payload.trip.length !== 6) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to set level: Invalid trip. Refer to `/help setlevel` for instructions on how to use this command.',
      id: Errors.SetLevel.BAD_TRIP,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (typeof payload.level !== 'string' || core.levelLabels.indexOf(payload.level) === -1) {
    return server.reply({
      cmd: 'warn',
      text: `Failed to set level: Invalid level label; choices are case sensitive: ${core.levelLabels.join(', ')}`,
      id: Errors.SetLevel.BAD_LABEL,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const newLevel = levels[payload.level];

  if (newLevel >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to set level: New level may not be the same or greater than your own.',
      id: Errors.SetLevel.LEVEL_CONFLICT,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const targetClients = server.findSockets({
    channel: socket.channel,
    trip: payload.trip,
  });

  const { color, flair } = getAppearance(newLevel);

  for (let i = 0, j = targetClients.length; i < j; i += 1) {
    if (targetClients[i].level >= socket.level) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to set level: Target has same or better credentials.',
        id: Errors.SetLevel.BAD_LEVEL,
        channel: socket.channel, // @todo Multichannel
      }, socket);
    } else {
      const setError = setChannelTripLevel(
        core.appConfig.data,
        socket.channel,
        payload.trip,
        newLevel,
      );

      if (setError !== '') {
        return server.reply({
          cmd: 'warn',
          text: `Failed to set level: ${setError}`,
          id: Errors.SetLevel.APPLY_ERROR,
          channel: socket.channel, // @todo Multichannel
        }, socket);
      }

      targetClients[i].color = color;
      targetClients[i].flair = flair;
      targetClients[i].level = newLevel;

      server.broadcast({
        ...getUserDetails(targetClients[i]),
        ...{
          cmd: 'updateUser',
          channel: socket.channel,
        },
      }, { channel: socket.channel });

      server.broadcast({
        cmd: 'info', // @todo Add numeric info code as `id`
        text: `Changed permission level of "${payload.trip}" to "${payload.level}"`,
        channel: socket.channel, // @todo Multichannel
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
  server.registerHook('in', 'chat', this.setlevelCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function setlevelCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/setlevel')) {
    const input = payload.text.split(' ');

    // If there is no trip parameter
    if (!input[1]) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to set level: Missing trip. Refer to `/help setlevel` for instructions on how to use this command.',
        id: Errors.SetLevel.BAD_TRIP,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    // If there is no level parameter
    if (!input[2]) {
      server.reply({
        cmd: 'warn',
        text: 'Failed to set level: Missing level label. Refer to `/help setlevel` for instructions on how to use this command.',
        id: Errors.SetLevel.BAD_LABEL,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'setlevel',
        trip: input[1],
        level: input[2],
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "trip", "level"
  * @public
  * @typedef {Array} setlevel/requiredData
  */
export const requiredData = ['trip', 'level'];

/**
  * Module meta information
  * @public
  * @typedef {Object} setlevel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'setlevel',
  category: 'channels',
  description: 'Alter the permission level a trip is allowed within current channel',
  usage: `
  API: { cmd: 'setlevel', trip: '[target trip]', level: '[level label]' }
  Text: /setlevel <trip> <"channelModerator" || "channelTrusted" || "trustedUser" || "default" || "bot">`,
};
