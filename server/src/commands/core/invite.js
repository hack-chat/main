/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

// module support functions
/**
  * Returns the channel that should be invited to.
  * @param {any} channel
  * @return {string}
  */
export function getChannel(channel = undefined) {
  if (typeof channel === 'string') {
    return channel;
  }
  return Math.random().toString(36).substr(2, 8);
}

// module main
export async function run({
  core, server, socket, payload,
}) {
  // check for spam
  if (server.police.frisk(socket.address, 2)) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'You are sending invites too fast. Wait a moment before trying again.',
    }, socket);
  }

  // verify user input
  if (typeof payload.userid !== 'number' || typeof payload.channel !== 'string') {
    return true;
  }

  // why would you invite yourself?
  if (payload.userid === socket.userid) {
    return true;
  }

  // @todo Verify this socket is part of payload.channel - multichannel patch
  // find target user
  let targetClient = server.findSockets({ channel: payload.channel, userid: payload.userid });

  if (targetClient.length === 0) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'Could not find user in that channel',
    }, socket);
  }

  [targetClient] = targetClient;

  // generate common channel
  const channel = getChannel(payload.to);

  // build invite
  const outgoingPayload = {
    cmd: 'invite',
    channel: socket.channel,
    from: socket.userid,
    to: payload.userid,
    inviteChannel: channel,
  };

  // send invite notice to target client
  server.reply(outgoingPayload, targetClient);

  // send invite notice to this client
  server.reply(outgoingPayload, socket);

  // stats are fun
  core.stats.increment('invites-sent');

  return true;
}

export const requiredData = []; // ['nick'];
export const info = {
  name: 'invite',
  description: 'Sends an invite to the target client with the provided channel, or a random channel.',
  usage: `
    API: { cmd: 'invite', nick: '<target nickname>', to: '<optional destination channel>' }`,
};
