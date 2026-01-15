/**
  * @author Marzavec
  * @summary Renews the claim
  * @version 1.1.0
  * @description Extend the ownership expiration date, before it expires
  * @module renewclaim
  */

import captcha from 'ascii-captcha';
import {
  isModerator,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
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
      text: "Failed to renew ownership: You're already a global moderator; it's free real estate. . .",
      id: Errors.RenewClaim.MODS_CANT,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

  if (channelSettings.owned === false || socket.trip !== channelSettings.ownerTrip) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to renew ownership: You may not do that',
      id: Errors.RenewClaim.NOT_OWNER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  const hoursLeft = Math.abs(channelSettings.claimExpires - new Date()) / (60 * 60 * 1000);

  if (hoursLeft > 24) {
    const timeLeft = hoursLeft - 24;

    return server.reply({
      cmd: 'warn',
      text: `Failed to renew ownership: You must wait. Hours until renewable: ${timeLeft}`,
      timeLeft,
      id: Errors.RenewClaim.TOO_SOON,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  socket.renewCaptcha = {
    solution: captcha.generateRandomText(7),
  };

  server.reply({
    cmd: 'warn',
    text: 'Enter the following to renew ownership (case-sensitive):',
    id: Errors.Captcha.MUST_SOLVE,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  server.reply({
    cmd: 'captcha',
    text: captcha.word2Transformedstr(socket.renewCaptcha.solution),
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

  if (typeof socket.renewCaptcha !== 'undefined') {
    if (payload.text === socket.renewCaptcha.solution) {
      socket.renewCaptcha = undefined;

      const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

      if (channelSettings.owned === false || socket.trip !== channelSettings.ownerTrip) {
        return server.reply({
          cmd: 'warn',
          text: 'Failed to renew ownership: You may not do that',
          id: Errors.RenewClaim.NOT_OWNER,
          channel: socket.channel, // @todo Multichannel
        }, socket);
      }

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + ClaimExpirationDays);
      channelSettings.claimExpires = expirationDate;

      updateChannelSettings(core.appConfig.data, socket.channel, channelSettings);

      server.reply({
        cmd: 'info',
        text: `Your claim has been renewed until ${expirationDate}`,
        id: Info.Admin.CONFIG_SAVED,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    server.police.frisk(socket, 7);
    socket.terminate();

    return false;
  }

  if (payload.text.startsWith('/renewclaim')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'renewclaim',
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} renewclaim/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'renewclaim',
  category: 'channels',
  description: 'Extend the ownership expiration date, before it expires.',
  usage: `
    API: { cmd: 'renewclaim' }
    Text: /renewclaim`,
};
