/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Sets channel to public
  * @version 1.1.0
  * @description Make channel publicly listed on the front page
  * @module makepublic
  */

import captcha from 'ascii-captcha';
import {
  isChannelOwner,
  isModerator,
  getUserLevel,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  getChannelSettings,
} from '../utility/_Channels.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 10);
  }

  // require trip code for ownership verification
  if (!socket.trip) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed. You must have a trip code',
      id: Errors.Global.MISSING_TRIPCODE,
      channel: targetChannel,
    }, socket);
  }

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce channel owner permission
  if (isModerator(socket) || !isChannelOwner(currentLevel)) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to make channel public: You may not do that',
      id: Errors.MakePublic.MISSING_PERMS,
      channel: targetChannel,
    }, socket);
  }

  // stage captcha challenge
  socket.pubCaptcha = {
    solution: captcha.generateRandomText(7),
    channel: targetChannel,
  };

  // prompt user to solve captcha
  server.reply({
    cmd: 'warn',
    text: 'Enter the following (case-sensitive)',
    id: Errors.Captcha.MUST_SOLVE,
    channel: targetChannel,
  }, socket);

  // dispatch ascii challenge text
  server.reply({
    cmd: 'captcha',
    text: captcha.word2Transformedstr(socket.pubCaptcha.solution),
    channel: targetChannel,
  }, socket);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
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

  const currentChannel = payload.channel;

  // intercept captcha responses
  if (typeof socket.pubCaptcha !== 'undefined') {
    if (socket.pubCaptcha.channel !== currentChannel) {
      return payload;
    }

    // process valid captcha solution
    if (payload.text === socket.pubCaptcha.solution) {
      const targetChannel = socket.pubCaptcha.channel;
      socket.pubCaptcha = undefined;

      const channelSettings = getChannelSettings(core.appConfig.data, targetChannel);

      // verify channel ownership status
      if (channelSettings.owned === false || socket.trip !== channelSettings.ownerTrip) {
        return server.reply({
          cmd: 'warn',
          text: 'Failed to make channel public: You may not do that',
          id: Errors.MakePublic.MISSING_PERMS,
          channel: targetChannel,
        }, socket);
      }

      // prevent duplicate public listings
      if (core.appConfig.data.publicChannels.indexOf(targetChannel) !== -1) {
        return server.reply({
          cmd: 'warn',
          text: 'Failed to make channel public: This channel is already public',
          id: Errors.MakePublic.ALREADY_PUBLIC,
          channel: targetChannel,
        }, socket);
      }

      // add channel to public directory
      core.appConfig.data.publicChannels.push(targetChannel);

      // notify global moderators
      server.broadcast({
        cmd: 'info',
        text: `A new channel has been made public: ?${targetChannel}`,
        id: Info.Core.NEW_PUBLIC,
        args: { targetChannel },
        channel: false,
      }, { level: (s) => isModerator(s) });

      // confirm success to user
      server.reply({
        cmd: 'info',
        text: 'Config saved!',
        id: Info.Admin.CONFIG_SAVED,
        channel: targetChannel,
      }, socket);

      return false;
    }

    // disconnect on failed captcha attempt
    server.police.frisk(socket, 7);
    socket.terminate();

    return false;
  }

  // intercept /makepublic command
  if (payload.text.startsWith('/makepublic')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'makepublic',
        channel: currentChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} makepublic/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'makepublic',
  category: 'channels',
  description: 'Make channel publicly listed on the front page',
  usage: `
    API: { cmd: 'makepublic' }
    Text: /makepublic`,
};
