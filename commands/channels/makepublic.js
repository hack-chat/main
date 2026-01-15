/**
  * @author Marzavec
  * @summary Sets channel to public
  * @version 1.1.0
  * @description Make channel publicly listed on the front page
  * @module makepublic
  */

import captcha from 'ascii-captcha';
import {
  isChannelOwner,
  isModerator,
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
  server, socket,
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

  if (isModerator(socket.level) || !isChannelOwner(socket.level)) {
    return server.reply({
      cmd: 'warn',
      text: 'Failed to make channel public: You may not do that',
      id: Errors.MakePublic.MISSING_PERMS,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  socket.pubCaptcha = {
    solution: captcha.generateRandomText(7),
  };

  server.reply({
    cmd: 'warn',
    text: 'Enter the following to make channel public (case-sensitive):',
    id: Errors.Captcha.MUST_SOLVE,
    channel: socket.channel, // @todo Multichannel
  }, socket);

  server.reply({
    cmd: 'captcha',
    text: captcha.word2Transformedstr(socket.pubCaptcha.solution),
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

  if (typeof socket.pubCaptcha !== 'undefined') {
    if (payload.text === socket.pubCaptcha.solution) {
      socket.pubCaptcha = undefined;

      const channelSettings = getChannelSettings(core.appConfig.data, socket.channel);

      if (channelSettings.owned === false || socket.trip !== channelSettings.ownerTrip) {
        return server.reply({
          cmd: 'warn',
          text: 'Failed to make channel public: You may not do that',
          id: Errors.MakePublic.MISSING_PERMS,
          channel: socket.channel, // @todo Multichannel
        }, socket);
      }

      if (core.appConfig.data.publicChannels.indexOf(socket.channel) !== -1) {
        return server.reply({
          cmd: 'warn',
          text: 'Failed to make channel public: This channel is already public',
          id: Errors.MakePublic.ALREADY_PUBLIC,
          channel: socket.channel, // @todo Multichannel
        }, socket);
      }

      core.appConfig.data.publicChannels.push(socket.channel);

      server.broadcast({
        cmd: 'info',
        text: `A new channel has been made public: ?${socket.channel}`,
        id: Info.Admin.SHOUT,
        channel: socket.channel, // @todo Multichannel
      }, { level: (level) => isModerator(level) });

      server.reply({
        cmd: 'info',
        text: 'This channel has been added to the list of public channels',
        id: Info.Admin.CONFIG_SAVED,
        channel: socket.channel, // @todo Multichannel
      }, socket);

      return false;
    }

    server.police.frisk(socket, 7);
    socket.terminate();

    return false;
  }

  if (payload.text.startsWith('/makepublic')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'makepublic',
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
