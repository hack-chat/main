/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

// module support functions
const verifyNickname = (nick) => /^[a-zA-Z0-9_]{1,24}$/.test(nick);

// Takes nick parameter (that may have gotten passed to invite) and returns the values in an array.
// Returns an empty array if it was invalid.
export function getNicknames(nick) {
  if (typeof nick === 'string') {
    return [nick];
  } else if (Array.isArray(nick)) {
    return nick;
  } else {
    return [];
  }
}
// Takes an array of nicknames and returns a failure message if it's bad, otherwise it returns null.
export function checkNicknamesValidity(server, fromNick, nicks) {
  if (nicks.length === 0) {
    return "There was no users specified to invite.";
  }

  for (let i = 0; i < nicks.length; i++) {
    const nick = nicks[i];
    if (nick === fromNick) {
      return "You can't invite yourself.";
    } else if (!verifyNickname(nick)) {
      return `Nickname (${nick}) given is invalid.`;
    } else if (server.findSockets({ nick: nick }).length == 0) {
      return `Could not find user ${nick} in channel`;
    }
  }

  return null;
}

export function getFormattedPayload (fromNick, channel) {
  return {
    cmd: 'info',
    type: 'invite',
    from: fromNick,
    invite: channel,
    text: `${fromNick} invited you to ?${channel}`
  }
}

export function getChannel (channel=undefined) {
  if (typeof channel === 'string') {
    return channel;
  } else {
    return Math.random().toString(36).substr(2, 8);
  }
}

export function getInviteSuccessPayload (nicks, channel) {
  return {
    cmd: 'info',
    type: 'invite',
    invite: channel,
    text: `You invited ${nicks.join(', ')} to ?${channel}`,
  };
}

export function sendInvites (server, fromNick, nicks, sourceChannel, inviteChannel) {
  const payload = getFormattedPayload(fromNick, inviteChannel);

  for (let i = 0; i < nicks.length; i++) {
    server.broadcast(payload, {
      channel: sourceChannel,
      nick: nicks[i]
    });
  }
}

// module main
export async function run(core, server, socket, data) {
  // check for spam
  if (server.police.frisk(socket.address, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending invites too fast. Wait a moment before trying again.',
    }, socket);``
  }

  const nicks = getNicknames(data.nick);

  const validatedStatus = checkNicknamesValidity(server, socket.nick, nicks);
  if (validatedStatus !== null) {
    server.reply({
      cmd: 'warn',
      text: validatedStatus
    }, socket)
    return true;
  }

  const channel = getChannel(data.to);

  sendInvites(server, socket.nick, nicks, socket.channel, channel);

  // reply with common channel
  server.reply(getInviteSuccessPayload(nicks, channel), socket);

  // stats are fun
  core.stats.increment('invites-sent', nicks.length);

  return true;
}

export const requiredData = ['nick'];
export const info = {
  name: 'invite',
  description: 'Sends an invite to the target client with the provided channel, or a random channel. `nick` may be a string, or an array of strings.',
  usage: `
    API: { cmd: 'invite', nick: '<target nickname>', to: '<optional destination channel>' }`,
};
