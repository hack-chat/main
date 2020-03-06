/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

import * as UAC from '../utility/UAC/_info';

// module support functions
/**
  * Returns a message for if it's a valid nickname to invite. Returns null if there was no error.
  * @param {any} nick
  * @return {(string|null)}
  */
export function checkNickname (nick, inviterNick) {
  if (typeof nick !== 'string' || !UAC.verifyNickname(nick)) {
    return "Nickname was invalid.";
  } else if (nick === inviterNick) {
    return "Why would you invite yourself?";
  }

  return null;
}

/**
  * Returns the channel that should be invited to.
  * @param {any} channel
  * @return {string}
  */
export function getChannel (channel=undefined) {
  if (typeof channel === 'string') {
    return channel;
  } else {
    return Math.random().toString(36).substr(2, 8);
  }
}

/**
  * Creates the payload that a user who is being invited would receive.
  * @param {string} inviter The user who is inviting them.
  * @param {string} channel The channel they are being invited to.
  * @return {Object}
  */
export function createRecipientPayload (inviter, channel) {
  return {
    cmd: 'info',
    type: 'invite',
    from: inviter,
    text: `${inviter} invited you to ?${channel}`,
  };
}

/**
  * Creates the payload that a user who invited users (and succeeded) would receive.
  * @param {string} nick The user who was invited.
  * @param {string} channel The channel they were invited to.
  */
export function createSuccessPayload (nick, channel) {
  return {
    cmd: 'info',
    type: 'invite',
    invite: channel,
    text: `You invited ${nick} to ?${channel}`,
  };
}

/**
  * Sends the invites to the recipients.
  * @param {MainServer} server The server. Required to broadcast the messages.
  * @param {string} recipientNick The user who is being invited.
  * @param {string} inviterNick The user who is doing the inviting.
  * @param {string} originalChannel The channel they have in common, and where the invite is sent in.
  * @param {string} inviteChannel The channel they are being invited to.
  */
export function sendInvite (server, recipientNick, inviterNick, originalChannel, inviteChannel) {
  return server.broadcast(createRecipientPayload(inviterNick, inviteChannel), {
    channel: originalChannel,
    nick: recipientNick,
  });
}

// module main
export async function run(core, server, socket, data) {
  // check for spam
  if (server.police.frisk(socket.address, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending invites too fast. Wait a moment before trying again.',
    }, socket);
  }

  // verify user input
  const nickValid = checkNickname(data.nick, socket.nick);
  if (nickValid !== null) {
    server.reply({
      cmd: 'warn',
      text: nickValid,
    }, socket);
    return true;
  }

  const channel = getChannel(data.to);

  // build and send invite
  const payload = createRecipientPayload(socket.nick, channel);

  const inviteSent = server.broadcast(payload, {
    channel: socket.channel,
    nick: data.nick,
  });

  // server indicates the user was not found
  if (!inviteSent) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel',
    }, socket);
  }

  // reply with common channel
  server.reply(createSuccessPayload(data.nick, channel), socket);

  // stats are fun
  core.stats.increment('invites-sent');

  return true;
}

export const requiredData = ['nick'];
export const info = {
  name: 'invite',
  description: 'Sends an invite to the target client with the provided channel, or a random channel.',
  usage: `
    API: { cmd: 'invite', nick: '<target nickname>', to: '<optional destination channel>' }`,
};
