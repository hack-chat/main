/* eslint no-param-reassign: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Locks the channel
  * @version 1.0.0
  * @description Locks a channel preventing default levels from joining
  * @module lockroom
  */

import {
  levels,
  isTrustedUser,
  isModerator,
  verifyNickname,
  getUserPerms,
} from '../utility/_UAC.js';
import {
  upgradeLegacyJoin,
  legacyLevelToLabel,
} from '../utility/_LegacyFunctions.js';
import {
  Errors,
} from '../utility/_Constants.js';
import {
  canJoinChannel,
} from '../utility/_Channels.js';

const danteQuotes = [
  'Do not be afraid; our fate cannot be taken from us; it is a gift.',
  'In the middle of the journey of our life I found myself within a dark woods where the straight way was lost.',
  'There is no greater sorrow then to recall our times of joy in wretchedness.',
  'They yearn for what they fear for.',
  'Through me you go into a city of weeping; through me you go into eternal pain; through me you go amongst the lost people',
  'From there we came outside and saw the stars',
  'But the stars that marked our starting fall away. We must go deeper into greater pain, for it is not permitted that we stay.',
  'Hope not ever to see Heaven. I have come to lead you to the other shore; into eternal darkness; into fire and into ice.',
  'As little flowers, which the chill of night has bent and huddled, when the white sun strikes, grow straight and open fully on their stems, so did I, too, with my exhausted force.',
  'At grief so deep the tongue must wag in vain; the language of our sense and memory lacks the vocabulary of such pain.',
  'Thence we came forth to rebehold the stars.',
  'He is, most of all, l\'amor che move il sole e l\'altre stelle.',
  'The poets leave hell and again behold the stars.',
  'One ought to be afraid of nothing other then things possessed of power to do us harm, but things innoucuous need not be feared.',
  'As phantoms frighten beasts when shadows fall.',
  'We were men once, though we\'ve become trees',
  'Here pity only lives when it is dead',
  'Lasciate ogne speranza, voi ch\'intrate.',
  'There is no greater sorrow than thinking back upon a happy time in misery',
  'My thoughts were full of other things When I wandered off the path.',
];

/**
  * Automatically executes once after server is ready
  * @param {Object} core - Reference to core enviroment object
  * @public
  * @return {void}
  */
export async function init(core) {
  if (typeof core.locked === 'undefined') {
    core.locked = {};
  }
}

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  let targetChannel;

  if (typeof payload.channel !== 'string') {
    if (typeof socket.channel !== 'string') { // @todo Multichannel
      return false; // silently fail
    }

    targetChannel = socket.channel;
  } else {
    targetChannel = payload.channel;
  }

  if (core.locked[targetChannel]) {
    return server.reply({
      cmd: 'info',
      text: 'Channel is already locked.',
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // apply lock flag to channel list
  core.locked[targetChannel] = true;

  // inform mods
  server.broadcast({
    cmd: 'info',
    text: `Channel: ?${targetChannel} lock enabled by [${socket.trip}]${socket.nick}`,
    channel: false, // @todo Multichannel, false for global info
  }, { level: isModerator });

  return true;
}

/**
  * Automatically executes once after server is ready to register this modules hooks
  * @param {Object} server - Reference to server enviroment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'changenick', this.changeNickCheck.bind(this), 1);
  server.registerHook('in', 'whisper', this.whisperCheck.bind(this), 1);
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 1);
  server.registerHook('in', 'invite', this.inviteCheck.bind(this), 1);
  server.registerHook('in', 'join', this.joinCheck.bind(this), 1);
}

/**
  * Executes every time an incoming changenick command is invoked;
  * hook incoming changenick commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function changeNickCheck({
  socket, payload,
}) {
  if (socket.channel === 'purgatory') { // @todo Multichannel update
    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming whisper command is invoked;
  * hook incoming whisper commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function whisperCheck({
  socket, payload,
}) {
  if (socket.channel === 'purgatory') { // @todo Multichannel update
    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming chat command is invoked;
  * hook incoming chat commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  socket, payload,
}) {
  if (socket.channel === 'purgatory') {
    if (socket.level >= levels.moderator) {
      return payload;
    }

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming invite command is invoked;
  * hook incoming invite commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function inviteCheck({
  socket, payload,
}) {
  if (socket.channel === 'purgatory') {
    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming join command is invoked;
  * hook incoming join commands, shunt them to purgatory if needed
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {{Object|boolean|string}} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function joinCheck({
  core, server, socket, payload,
}) {
  // check if target channel is locked
  if (typeof core.locked[payload.channel] === 'undefined' || core.locked[payload.channel] !== true) {
    if (payload.channel !== 'purgatory') {
      return payload;
    }
  }

  // `join` is the legacy entry point, check if it needs to be upgraded
  if (typeof socket.hcProtocol === 'undefined') {
    payload = upgradeLegacyJoin(server, socket, payload);
  }

  // store payload values
  const { channel, nick, pass } = payload;

  // check if a client is able to join target channel
  const mayJoin = canJoinChannel(channel, socket);
  if (mayJoin !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not join that channel.',
      id: mayJoin,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // calling socket already in a channel
  // @todo multichannel update, will remove
  if (typeof socket.channel !== 'undefined') {
    return server.reply({
      cmd: 'warn', // @todo Remove this
      text: 'Joining more than one channel is not currently supported',
      id: Errors.Join.ALREADY_JOINED,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }
  // end todo

  // validates the user input for `nick`
  if (verifyNickname(nick, socket) !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'Nickname must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: false, // @todo Multichannel, false for global event
    }, socket);
  }

  // get trip and level
  const { trip, level } = getUserPerms(pass, core.saltKey, core.appConfig.data, channel);

  // store the user values
  const userInfo = {
    nick,
    trip,
    uType: legacyLevelToLabel(level),
    hash: socket.hash,
    level,
    userid: socket.userid,
    isBot: socket.isBot,
    color: socket.color,
    channel,
  };

  // check if trip is allowed
  if (userInfo.uType === 'user') {
    if (userInfo.trip == null || isTrustedUser(level) === false) {
      const origNick = userInfo.nick;
      const origChannel = payload.channel;

      // not allowed, shunt to purgatory
      payload.channel = 'purgatory';

      // lost souls have no names
      if (origChannel === 'purgatory') {
        // someone is pulling a Dante
        payload.nick = `Dante_${Math.random().toString(36).substr(2, 8)}`;
      } else {
        payload.nick = `${Math.random().toString(36).substr(2, 8)}${Math.random().toString(36).substr(2, 8)}`;
      }

      setTimeout(() => {
        server.reply({
          cmd: 'info',
          text: danteQuotes[Math.floor(Math.random() * danteQuotes.length)],
          channel: 'purgatory', // @todo Multichannel
        }, socket);
      }, 100);

      server.broadcast({
        cmd: 'info',
        text: `${payload.nick} is: ${origNick}\ntrip: ${userInfo.trip || 'none'}\ntried to join: ?${origChannel}\nhash: ${userInfo.hash}`,
        channel: 'purgatory', // @todo Multichannel, false for global info
      }, { channel: 'purgatory', level: isModerator });
    }
  }

  return payload;
}

/**
  * Module meta information
  * @public
  * @typedef {Object} kick/info
  * @property {string} name - Module command name
  * @property {string} category - Module category name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'lockroom',
  category: 'moderators',
  description: 'Locks a channel preventing default levels from joining',
  usage: `
    API: { cmd: 'lockroom', channel: '<optional channel, defaults to your current channel>' }`,
};
