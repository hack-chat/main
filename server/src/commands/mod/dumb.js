/* eslint no-param-reassign: 0 */
/* eslint no-multi-assign: 0 */

/*
 * Description: Make a user (spammer) dumb (mute)
 * Author: simple
 */

import {
  isModerator,
} from '../utility/_UAC';
import {
  Errors,
} from '../utility/_Constants';
import {
  findUser,
} from '../utility/_Channels';

// module constructor
export function init(core) {
  if (typeof core.muzzledHashes === 'undefined') {
    core.muzzledHashes = {};
  }
}

// module main
export async function run({
  core, server, socket, payload,
}) {
  // increase rate limit chance and ignore if not admin or mod
  if (!isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'string') {
      return true;
    }

    payload.channel = socket.channel;
  } else if (typeof payload.userid !== 'number') {
    return true;
  }

  // find target user
  const targetUser = findUser(server, payload);
  if (!targetUser) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in that channel',
      id: Errors.Global.UNKNOWN_USER,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // likely dont need this, muting mods and admins is fine
  if (targetUser.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'This trick wont work on users of the same level',
      id: Errors.Global.PERMISSION,
      channel: socket.channel, // @todo Multichannel
    }, socket);
  }

  // store hash in mute list
  const record = core.muzzledHashes[targetUser.hash] = {
    dumb: true,
  };

  // store allies if needed
  if (payload.allies && Array.isArray(payload.allies)) {
    record.allies = payload.allies;
  }

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} muzzled ${targetUser.nick} in ${payload.channel}, userhash: ${targetUser.hash}`,
    channel: false, // @todo Multichannel, false for global
  }, { level: isModerator });

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 10);
  server.registerHook('in', 'invite', this.inviteCheck.bind(this), 10);
  server.registerHook('in', 'whisper', this.whisperCheck.bind(this), 10);
}

// hook incoming chat commands, shadow-prevent chat if they are muzzled
export function chatCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (core.muzzledHashes[socket.hash]) {
    // build fake chat payload
    const mutedPayload = {
      cmd: 'chat',
      nick: socket.nick,
      text: payload.text,
      channel: socket.channel, // @todo Multichannel
    };

    if (socket.trip) {
      mutedPayload.trip = socket.trip;
    }

    // broadcast to any duplicate connections in channel
    server.broadcast(mutedPayload, { channel: socket.channel, hash: socket.hash });

    // broadcast to allies, if any
    if (core.muzzledHashes[socket.hash].allies) {
      server.broadcast(
        mutedPayload,
        {
          channel: socket.channel,
          nick: core.muzzledHashes[socket.hash].allies,
        },
      );
    }

    /**
      * Blanket "spam" protection.
      * May expose the ratelimiting lines from `chat` and use that
      * @todo one day #lazydev
      */
    server.police.frisk(socket.address, 9);

    return false;
  }

  return payload;
}

// shadow-prevent all invites from muzzled users
export function inviteCheck({ core, socket, payload }) {
  if (core.muzzledHashes[socket.hash]) {
    // @todo convert to protocol 2
    /* const nickValid = Invite.checkNickname(payload.nick);
    if (nickValid !== null) {
      server.reply({
        cmd: 'warn', // @todo Add numeric error code as `id`
        text: nickValid,
        channel: socket.channel, // @todo Multichannel
      }, socket);
      return false;
    }

    // generate common channel
    const channel = Invite.getChannel();

    // send fake reply
    server.reply(Invite.createSuccessPayload(payload.nick, channel), socket); */

    return false;
  }

  return payload;
}

// shadow-prevent all whispers from muzzled users
export function whisperCheck({
  core, server, socket, payload,
}) {
  if (typeof payload.nick !== 'string') {
    return false;
  }

  if (typeof payload.text !== 'string') {
    return false;
  }

  if (core.muzzledHashes[socket.hash]) {
    const targetNick = payload.nick;

    server.reply({
      cmd: 'info',
      type: 'whisper',
      text: `You whispered to @${targetNick}: ${payload.text}`,
      channel: socket.channel, // @todo Multichannel
    }, socket);

    // blanket "spam" protection, may expose the ratelimiting lines from
    // `chat` and use that, @todo one day #lazydev
    server.police.frisk(socket.address, 9);

    return false;
  }

  return payload;
}

// export const requiredData = ['nick'];
export const info = {
  name: 'dumb',
  description: 'Globally shadow mute a connection. Optional allies array will see muted messages.',
  usage: `
    API: { cmd: 'dumb', nick: '<target nick>', allies: ['<optional nick array>', ...] }`,
};
info.aliases = ['muzzle', 'mute'];
