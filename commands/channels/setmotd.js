/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Change motd
  * @version 1.1.0
  * @description Update the channel motd to something new
  * @module setmotd
  */

/*
import {
  isChannelModerator,
  getUserLevel,
} from '../utility/_UAC.js';
import {
  getChannelSettings,
  updateChannelSettings,
} from '../utility/_Channels.js';
*/
import {
  Errors,
  // Info,
  // MaxMOTDLength,
} from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  /* core, */ server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 10);
  }

  // enforce rate limits
  if (server.police.frisk(socket, 6)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // module currently disabled by design
  server.reply({
    cmd: 'warn',
    text: 'setMotd is disabled',
    // id: @todo
    channel: targetChannel,
  }, socket);

  /*

  // verify moderator status
  const requestLevel = getUserLevel(socket, targetChannel);

  if (!isChannelModerator(requestLevel)) {
    return false;
  }

  // validate motd string and length
  if (typeof payload.motd !== 'string' || payload.motd.length >= MaxMOTDLength) {
    return server.reply({
      cmd: 'warn',
      text: `Failed to set motd: Invalid motd, max length: ${MaxMOTDLength}`,
      id: Errors.SetMOTD.TOO_LONG,
      args: { maxLength: MaxMOTDLength },
      channel: targetChannel,
    }, socket);
  }

  // update configuration
  const channelSettings = getChannelSettings(core.appConfig.data, targetChannel);

  channelSettings.motd = payload.motd;

  updateChannelSettings(core.appConfig.data, targetChannel, channelSettings);

  // notify channel mods
  const modFilter = (client) => {
    const inChannel = client.channels && client.channels.includes(targetChannel);
    return inChannel && isChannelModerator(getUserLevel(client, targetChannel));
  };

  server.broadcast({
    cmd: 'info',
    text: `MOTD changed by [${socket.trip}]${socket.nick}, new motd:`,
    id: Info.ChannelInfo.MOTD_CHANGED,
    args: {
      trip: socket.trip,
      nick: socket.nick,
    },
    channel: targetChannel,
  }, modFilter);

  server.broadcast({
    cmd: 'info',
    text: `${channelSettings.motd}`,
    id: Info.Core.MOTD,
    channel: targetChannel,
  }, modFilter);

  */
  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  // verify user input
  if (!payload || typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /setmotd command
  if (payload.text.startsWith('/setmotd')) {
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'setmotd',
        motd: payload.text.substring(8).trim(),
        channel: targetChannel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * The following payload properties are required to invoke this module:
  * "motd"
  * @public
  * @typedef {Array} setmotd/requiredData
  */
export const requiredData = ['motd'];

/**
  * Module meta information
  * @public
  * @typedef {Object} setmotd/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'setmotd',
  category: 'channels',
  description: 'Update the channel motd to something new',
  usage: `
    API: { cmd: 'setmotd', motd: '[new motd]' }
    Text: /setmotd <new motd>`,
};
