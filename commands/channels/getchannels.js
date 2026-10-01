/* eslint import/no-cycle: [0, { ignoreExternal: true }] */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Get public channels
  * @version 1.1.0
  * @description Sends back the public channel list with user counts
  * @module getchannels
  */

import {
  Errors,
  Info,
} from '../utility/_Constants.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // enforce rate limits
  if (server.police.frisk(socket, 4)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel || false,
    }, socket);
  }

  // use object destructuring to satisfy linting
  const { publicChannels } = core.appConfig.data;
  const list = [];

  // initialize public channel list
  for (let i = 0; i < publicChannels.length; i += 1) {
    list.push({
      name: publicChannels[i],
      count: 0,
    });
  }

  // iterate clients to count users in public channels
  server.clients.forEach((client) => {
    if (client.channels && Array.isArray(client.channels)) {
      client.channels.forEach((channelName) => {
        const listIndex = publicChannels.indexOf(channelName);

        if (listIndex !== -1) {
          list[listIndex].count += 1;
        }
      });
    }
  });

  // sort by count descending (most popular first)
  list.sort((a, b) => b.count - a.count);

  // if invoked via chat command, send a markdown table via 'info' event
  if (payload.isChat) {
    let reply = '| Channel | Users |\n';
    reply += '| :--- | :--- |\n';

    for (let i = 0; i < list.length; i += 1) {
      // the ? prefix creates a clickable channel link in the client
      reply += `| ?${list[i].name} | ${list[i].count} |\n`;
    }

    reply += '\n---\n';
    reply += `**Total Public Channels:** ${list.length}`;

    return server.reply({
      cmd: 'info',
      text: reply,
      id: Info.Core.CHANNEL_LIST,
      channel: targetChannel,
    }, socket);
  }

  // standard api response (json)
  return server.reply({
    cmd: 'publicchannels',
    list,
  }, socket);
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.runChatCheck.bind(this), 80);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function runChatCheck({
  core, server, socket, payload,
}) {
  if (!payload || typeof payload.text !== 'string') {
    return false;
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return payload;
  }

  // intercept /getchannels command
  if (payload.text.startsWith('/getchannels')) {
    // trigger isChat run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'getchannels',
        channel: targetChannel,
        isChat: true,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} getchannels/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'getchannels',
  category: 'core',
  description: 'Sends back the public channel list with user counts',
  usage: `
    API: { cmd: 'getchannels' }
    Text: /getchannels`,
};
