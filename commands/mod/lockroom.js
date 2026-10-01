/* eslint no-param-reassign: 0 */

/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Locks the channel
  * @version 1.1.0
  * @description Locks a channel preventing default levels from joining
  * @module lockroom
  */

import {
  isModerator,
  isChannelModerator,
  verifyNickname,
  getUserPerms,
  getUserLevel,
  levels,
} from '../utility/_UAC.js';
import {
  upgradeLegacyJoin,
  legacyLevelToLabel,
} from '../utility/_LegacyFunctions.js';
import {
  Errors,
  Info,
} from '../utility/_Constants.js';
import {
  canJoinChannel,
} from '../utility/_Channels.js';

// selection of quotes for users trapped in purgatory
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
  * @param {Object} core - Reference to core environment object
  * @public
  * @return {void}
  */
export async function init(core) {
  // initialize lock tracking object
  if (typeof core.locked === 'undefined') {
    core.locked = {};
  }
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
  const targetChannel = payload.channel;

  // validate presence in channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.police.frisk(socket, 10);
  }

  const currentLevel = getUserLevel(socket, targetChannel);

  // enforce moderator permission
  if (currentLevel < levels.channelModerator) {
    return server.police.frisk(socket, 10);
  }

  // check if already locked
  if (typeof core.locked[targetChannel] !== 'undefined' && core.locked[targetChannel] !== false) {
    return server.reply({
      cmd: 'warn',
      text: 'Channel is already locked',
      id: Errors.LockRoom.ALREADY_LOCKED,
      channel: targetChannel,
    }, socket);
  }

  let lockLevel = currentLevel;

  // parse optional target lock level
  if (typeof payload.level !== 'undefined') {
    if (typeof payload.level === 'string') {
      if (typeof levels[payload.level] === 'number') {
        lockLevel = levels[payload.level];
      }
    } else if (typeof payload.level === 'number') {
      if (lockLevel > 1) {
        lockLevel = payload.level;
      }
    } else {
      const validLabels = Object.keys(levels).join(', ');

      return server.reply({
        cmd: 'warn',
        text: `Expected "level" to be a number or string label: ${validLabels}`,
        id: Errors.LockRoom.LEVEL_REQUIRED,
        args: { validLabels },
        channel: targetChannel,
      }, socket);
    }
  }

  // prevent locking out equal or higher ranks
  if (lockLevel > currentLevel) {
    return server.reply({
      cmd: 'warn',
      text: `Target level too high (${lockLevel}). You may only lock up to ${currentLevel}`,
      id: Errors.LockRoom.LEVEL_TOO_HIGH,
      args: {
        lockLevel,
        currentLevel,
      },
      channel: targetChannel,
    }, socket);
  }

  // apply lock to channel
  core.locked[targetChannel] = lockLevel;

  // inform mods
  server.broadcast({
    cmd: 'info',
    text: `Channel: ?${targetChannel} locked to ${lockLevel} by [${socket.trip}]${socket.nick}`,
    id: Info.Mod.LOCKED_DETAILED,
    args: {
      targetChannel,
      lockLevel,
      trip: socket.trip,
      nick: socket.nick,
    },
    channel: targetChannel,
  }, (client) => {
    const inChannel = (client.channels && client.channels.includes(targetChannel));
    return inChannel && isChannelModerator(client, targetChannel);
  });

  console.log(`Channel: ?${targetChannel} locked to ${lockLevel} by [${socket.trip}]${socket.nick}`);

  return true;
}

/**
  * Automatically executes once after server is ready to register this module's hooks
  * @param {Object} server - Reference to server environment object
  * @public
  * @return {void}
  */
export function initHooks(server) {
  server.registerHook('in', 'changenick', this.changeNickCheck.bind(this), 4);
  server.registerHook('in', 'whisper', this.whisperCheck.bind(this), 4);
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 4);
  server.registerHook('in', 'invite', this.inviteCheck.bind(this), 4);
  server.registerHook('in', 'join', this.joinCheck.bind(this), 4);
}

/**
  * Executes every time an incoming changenick command is invoked;
  * hook incoming changenick commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Environment object with references to payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function changeNickCheck({
  payload,
}) {
  const { channel } = payload;

  if (channel === 'purgatory') {
    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming whisper command is invoked;
  * hook incoming whisper commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Environment object with references to payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function whisperCheck({
  payload,
}) {
  const { channel } = payload;

  if (channel === 'purgatory') {
    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming chat command is invoked;
  * hook incoming chat commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function chatCheck({
  core, server, socket, payload,
}) {
  const targetChannel = payload.channel;

  // permit moderators to speak in purgatory
  if (targetChannel === 'purgatory') {
    if (isModerator(socket)) {
      return payload;
    }

    return false;
  }

  if (typeof payload.text !== 'string') {
    return false;
  }

  // intercept lockroom command
  if (payload.text.startsWith('/lockroom')) {
    const [, levelArg] = payload.text.split(' ');

    const newPayload = {
      cmd: 'lockroom',
      channel: targetChannel,
    };

    // pass along optional level argument
    if (levelArg) {
      const parsedLevel = Number(levelArg);
      newPayload.level = !Number.isNaN(parsedLevel) ? parsedLevel : levelArg;
    }

    // trigger standard run execution
    this.run({
      core,
      server,
      socket,
      payload: newPayload,
    });

    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming invite command is invoked;
  * hook incoming invite commands, reject them if the channel is 'purgatory'
  * @param {Object} env - Environment object with references to payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function inviteCheck({
  payload,
}) {
  const { channel } = payload;

  if (channel === 'purgatory') {
    return false;
  }

  return payload;
}

/**
  * Executes every time an incoming join command is invoked;
  * hook incoming join commands, shunt them to purgatory if needed
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {(Object|boolean|string)} Object = same/altered payload,
  * false = suppress action,
  * string = error
  */
export function joinCheck({
  core, server, socket, payload,
}) {
  // bypass if target channel is not locked
  if (typeof core.locked[payload.channel] === 'undefined' || core.locked[payload.channel] === false) {
    if (payload.channel !== 'purgatory') {
      return payload;
    }
  }

  // `join` is the legacy entry point, check if it needs to be upgraded
  if (typeof socket.hcProtocol === 'undefined' || socket.hcProtocol === 1) {
    payload = upgradeLegacyJoin(server, socket, payload);
  }

  // store payload values
  const { channel, nick, pass } = payload;

  // check if a client is able to join target channel
  const mayJoin = canJoinChannel(channel, socket);
  if (mayJoin !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'You may not join that channel',
      id: mayJoin,
      channel: false,
    }, socket);
  }

  // validates the user input for `nick`
  if (verifyNickname(nick, socket) !== true) {
    return server.reply({
      cmd: 'warn',
      text: 'Username must consist of up to 24 letters, numbers, and underscores',
      id: Errors.Join.INVALID_NICK,
      channel: false,
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

  // shunt unauthorized users to purgatory
  if (core.locked[channel] > userInfo.level) {
    const origNick = userInfo.nick;
    const origChannel = payload.channel;

    // redirect payload
    payload.channel = 'purgatory';

    // lost souls have no names
    if (origChannel === 'purgatory') {
      // someone is pulling a Dante
      payload.nick = `Dante_${Math.random().toString(36).slice(2, 8)}`;
    } else {
      payload.nick = `${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`;
    }

    // drop quote
    setTimeout(() => {
      server.reply({
        cmd: 'info',
        text: danteQuotes[Math.floor(Math.random() * danteQuotes.length)],
        id: Info.Core.PURGATORY_QUOTE,
        channel: 'purgatory',
      }, socket);
    }, 100);

    // notify global moderators
    server.broadcast({
      cmd: 'info',
      text: `${payload.nick} is: ${origNick}\ntrip: ${userInfo.trip || 'none'}\ntried to join: ?${origChannel}\nhash: ${userInfo.hash}`,
      id: Info.Core.PURGATORY_NOTIFY,
      channel: 'purgatory',
    }, (client) => {
      const inPurgatory = (client.channels && client.channels.includes('purgatory'));
      return inPurgatory && isModerator(client);
    });
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
    API: { cmd: 'lockroom', channel: '<optional channel, defaults to your current channel>', level: <optional string or number> }
    Text: /lockroom`,
};
