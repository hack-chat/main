/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Ban a user
  * @version 1.1.0
  * @description Bans target user by name
  * @module ban
  */

import {
  isModerator,
  getUserDetails,
} from '../utility/_UAC.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  findUsers,
} from '../utility/_Channels.js';
import {
  getSession,
} from '../core/session.js';

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // enforce moderation level
  if (!isModerator(socket)) {
    return server.police.frisk(socket, 10);
  }

  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 1);
  }

  // check user input for arrays or strings
  const hasValidNick = typeof payload.nick === 'string' || Array.isArray(payload.nick);
  const hasValidUserid = typeof payload.userid === 'number' || Array.isArray(payload.userid);

  if (!hasValidNick && !hasValidUserid) {
    return true;
  }

  // ensure payload has the channel for findUsers
  if (!payload.channel) {
    payload.channel = targetChannel;
  }

  // find target user(s)
  const badClients = findUsers(server, payload);
  if (badClients.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: targetChannel,
    }, socket);
  }

  const banned = [];

  // check if found targets are bannable
  badClients.forEach((targetUser) => {
    if (targetUser.globalLevel >= socket.globalLevel) {
      server.reply({
        cmd: 'warn',
        text: 'You may not do that',
        id: Errors.Global.PERMISSION,
        channel: targetChannel,
      }, socket);
    } else {
      banned.push(targetUser);
    }
  });

  if (banned.length === 0) {
    return true;
  }

  banned.forEach((targetUser) => {
    const targetNick = targetUser.nick;

    // commit arrest record
    server.police.arrest(targetUser.address, targetUser.hash);

    console.log(`${socket.nick} [${socket.trip}] banned ${targetNick} in ${targetChannel}`);

    // broadcast ban notifications
    if (targetUser.channels && Array.isArray(targetUser.channels)) {
      targetUser.channels.forEach((c) => {
        // notify normal users
        server.broadcast({
          cmd: 'info',
          text: `Banned ${targetNick}`,
          id: Info.Mod.BANNED,
          args: { targetNick },
          user: getUserDetails(targetUser, c),
          channel: c,
        }, (client) => {
          const inChannel = (client.channels && client.channels.includes(c));
          return inChannel && !isModerator(client, targetChannel);
        });

        // notify moderators with details
        server.broadcast({
          cmd: 'info',
          text: `${socket.nick}#${socket.trip} banned ${targetNick} in ${targetChannel}, `
            + `userhash: ${targetUser.hash}`,
          id: Info.Mod.BANNED_DETAILED,
          args: {
            nick: socket.nick,
            trip: socket.trip,
            targetNick,
            targetChannel,
            hash: targetUser.hash,
          },
          channel: c,
          inChannel: targetChannel,
          user: getUserDetails(targetUser, c),
          banner: getUserDetails(socket, c),
        }, (client) => isModerator(client));
      });
    }

    targetUser.banned = true;

    // trigger client-side session clearing
    server.reply({
      cmd: 'session',
      restored: false,
      token: getSession(targetUser, core),
      channels: targetUser.channels,
    }, targetUser);

    // force connection closed
    targetUser.terminate();
  });

  // update ban stats
  core.stats.increment('users-banned', banned.length);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'chat', this.banCheck.bind(this), 29);
}

/**
  * Executes every time an incoming chat command is invoked
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function banCheck({
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

  // intercept /ban command
  if (payload.text.startsWith('/ban ')) {
    const input = payload.text.split(' ');

    const nicks = input.slice(1)
      .map((n) => n.replace(/@/g, '').replace(/[^a-zA-Z0-9_]/g, ''))
      .filter((n) => n.length > 0);

    if (nicks.length === 0) {
      server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
        id: Errors.Global.UNKNOWN_USER,
        channel: payload.channel,
      }, socket);

      return false;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: {
        cmd: 'ban',
        nick: nicks,
        channel: payload.channel,
      },
    });

    return false;
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} ban/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'ban',
  category: 'moderators',
  description: 'Bans target user(s) by name',
  usage: `
    API: { cmd: 'ban', nick: '<target nickname>|[<target nicknames>]' }
    API: { cmd: 'ban', userid: <target id>|[<target ids>] }
    Text: /ban <target nickname> [@anotherNick] ...`,
};
