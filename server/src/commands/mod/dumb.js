/*
 * Description: Make a user (spammer) dumb (mute)
 * Author: simple
 */

import * as UAC from '../utility/UAC/_info';
import * as Invite from '../core/invite';

// module constructor
export function init(core) {
  if (typeof core.muzzledHashes === 'undefined') {
    core.muzzledHashes = {};
  }
}

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin or mod
  if (!UAC.isModerator(socket.level)) {
    return server.police.frisk(socket.address, 10);
  }

  // check user input
  if (typeof data.nick !== 'string') {
    return true;
  }

  // find target user
  let badClient = server.findSockets({ channel: socket.channel, nick: data.nick });

  if (badClient.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel',
    }, socket);
  }

  [badClient] = badClient;

  // likely dont need this, muting mods and admins is fine
  if (badClient.level >= socket.level) {
    return server.reply({
      cmd: 'warn',
      text: 'This trick wont work on users of the same level',
    }, socket);
  }

  // store hash in mute list
  const record = core.muzzledHashes[badClient.hash] = {
    dumb: true,
  };

  // store allies if needed
  if (data.allies && Array.isArray(data.allies)) {
    record.allies = data.allies;
  }

  // notify mods
  server.broadcast({
    cmd: 'info',
    text: `${socket.nick}#${socket.trip} muzzled ${data.nick} in ${socket.channel}, userhash: ${badClient.hash}`,
  }, { level: UAC.isModerator });

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 10);
  server.registerHook('in', 'invite', this.inviteCheck.bind(this), 10);
  server.registerHook('in', 'whisper', this.whisperCheck.bind(this), 10);
}

// hook incoming chat commands, shadow-prevent chat if they are muzzled
export function chatCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (core.muzzledHashes[socket.hash]) {
    // build fake chat payload
    const mutedPayload = {
      cmd: 'chat',
      nick: socket.nick,
      text: payload.text,
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
export function inviteCheck(core, server, socket, payload) {
  if (core.muzzledHashes[socket.hash]) {
    const nickValid = Invite.checkNickname(payload.nick);
    if (nickValid !== null) {
      server.reply({
        cmd: 'warn',
        text: nickValid,
      }, socket);
      return false;
    }

    // generate common channel
    const channel = Invite.getChannel();

    // send fake reply
    server.reply(Invite.createSuccessPayload(payload.nick, channel), socket);

    return false;
  }

  return payload;
}

// shadow-prevent all whispers from muzzled users
export function whisperCheck(core, server, socket, payload) {
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
    }, socket);

    // blanket "spam" protection, may expose the ratelimiting lines from `chat` and use that, TODO: one day #lazydev
    server.police.frisk(socket.address, 9);

    return false;
  }

  return payload;
}

export const requiredData = ['nick'];
export const info = {
  name: 'dumb',
  description: 'Globally shadow mute a connection. Optional allies array will see muted messages.',
  usage: `
    API: { cmd: 'dumb', nick: '<target nick>', allies: ['<optional nick array>', ...] }`,
};
info.aliases = ['muzzle', 'mute'];
