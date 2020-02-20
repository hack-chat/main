import * as Invite from "../core/invite"

/*
 * Description: Make a user (spammer) dumb (mute)
 * Author: simple
 */

// module constructor
export function init(core) {
  if (typeof core.muzzledHashes === 'undefined') {
    core.muzzledHashes = {};
  }
}

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin or mod
  if (socket.uType === 'user') {
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
  if (badClient.uType !== 'user') {
    return server.reply({
      cmd: 'warn',
      text: 'This trick wont work on mods and admin',
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
    text: `${socket.nick} muzzled ${data.nick} in ${socket.channel}, userhash: ${badClient.hash}`,
  }, { uType: 'mod' });

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.chatCheck.bind(this), 25);
  server.registerHook('in', 'invite', this.inviteCheck.bind(this), 25);
  // TODO: add whisper hook, need hook priorities todo finished first
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
    // Simulate invite
    console.log("Dumbed invite check");
    const nicks = Invite.getNicknames(payload.nick);
    const validatedStatus = Invite.checkNicknamesValidity(server, socket.nick, nicks);
    if (validatedStatus !== null) {
      server.reply({
        cmd: 'warn',
        text: validatedStatus,
      }, socket);
      return false;
    }

    const channel = Invite.getChannel(payload.to);

    // send fake reply
    server.reply(Invite.getInviteSuccessPayload(nicks, channel), socket);

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
