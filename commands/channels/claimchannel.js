/**
  * @author Marzavec
  * @summary Take channel ownership
  * @version 1.0.0
  * @description Claim an unowned channel, enabling user management options
  * @module claimchannel
  */

import captcha from 'ascii-captcha';
import {
  isModerator,
  getUserDetails,
  levels,
  getAppearance,
} from '../utility/_UAC.js';
import {
  Errors,
  ClaimExpirationDays,
} from '../utility/_Constants.js';
import {
  getChannelSettings,
  updateChannelSettings,
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
      text: 'Failed to run command: You must have a trip code to do this.',
      id: Errors.Global.MISSING_TRIPCODE,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  if (isModerator(socket.level)) {
    return server.reply({
      cmd: 'warn',
      text: "Failed to take ownership: You're already a global moderator; it's free real estate. . .",
      id: Errors.ClaimChannel.MODS_CANT,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

  if (channelSettings.owned) {
    return server.reply({
      cmd: 'warn',
      text: `Failed to take ownership: This channel is already owned by the trip "${channelSettings.ownerTrip}", until ${channelSettings.claimExpires}`,
      ownerTrip: channelSettings.ownerTrip,
      claimExpires: channelSettings.claimExpires,
      id: Errors.ClaimChannel.ALREADY_OWNED,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  socket.claimCaptcha = {
    solution: captcha.generateRandomText(7),
  };

  server.reply({
    cmd: 'warn',
    text: 'Enter the following to take ownership (case-sensitive):',
    id: Errors.Captcha.MUST_SOLVE,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  server.reply({
    cmd: 'captcha',
    text: captcha.word2Transformedstr(socket.claimCaptcha.solution),
    channel: socket.channel, // @todo Multichannel
  }, socket);

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

  if (typeof socket.claimCaptcha !== 'undefined') {
    if (payload.text === socket.claimCaptcha.solution) {
      socket.claimCaptcha = undefined;

      const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

      if (channelSettings.owned) {
        return server.reply({
          cmd: 'warn',
          text: `Failed to take ownership: This channel is already owned by the trip "${channelSettings.ownerTrip}", until ${channelSettings.claimExpires}`,
          ownerTrip: channelSettings.ownerTrip,
          claimExpires: channelSettings.claimExpires,
          id: Errors.ClaimChannel.ALREADY_OWNED,
          channel: socket.channel, // @todo Multichannel
        }, socket);
      }

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + ClaimExpirationDays);
      channelSettings.claimExpires = expirationDate;
      channelSettings.owned = true;
      channelSettings.ownerTrip = socket.trip;

      updateChannelSettings(core.appConfig.data, socket.channel, channelSettings);

      console.log(`[${socket.trip}]${socket.nick} claimed ?${socket.channel}`);

      server.broadcast({
        cmd: 'info', // @todo Add numeric info code as `id`
        text: `Channel now owned by "${socket.trip}", until ${channelSettings.claimExpires}`,
        channel: socket.channel,
      }, { channel: socket.channel });

      const { color, flair } = getAppearance(levels.channelOwner);
      socket.color = color;
      socket.flair = flair;
      socket.level = levels.channelOwner;

      const updateNotice = {
        ...getUserDetails(socket),
        ...{
          cmd: 'updateUser',
          channel: socket.channel,
        },
      };

      server.broadcast(updateNotice, { channel: socket.channel });

      return false;
    }

    server.police.frisk(socket, 7);
    socket.terminate();

    return false;
  }

  if (payload.text.startsWith('/claimchannel')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'claimchannel',
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} claimchannel/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'claimchannel',
  category: 'channels',
  description: 'Claim an unowned channel, enabling user management options. You must have a trip code to run this command.',
  usage: `
  API: { cmd: 'claimchannel' }
  Text: /claimchannel`,
};
