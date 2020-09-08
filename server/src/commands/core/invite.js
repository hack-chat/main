/*
  Description: Generates a semi-unique channel name then broadcasts it to each client
*/

// module support functions
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

// module main
export async function run(core, server, socket, data) {
  // check for spam
  if (server.police.frisk(socket.address, 2)) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'You are sending invites too fast. Wait a moment before trying again.',
    }, socket);
  }

  // verify user input
  if (typeof data.userid !== 'number' || typeof data.channel !== 'string') {
    return true;
  }

  // why would you invite yourself?
  if (data.userid === socket.userid) {
    return true;
  }

  // @todo Verify this socket is part of data.channel - multichannel patch
  // find target user
  let targetClient = server.findSockets({ channel: data.channel, userid: data.userid });

  if (targetClient.length === 0) {
    return server.reply({
      cmd: 'warn', // @todo Remove english and change to numeric id
      text: 'Could not find user in that channel',
    }, socket);
  }

  [targetClient] = targetClient;

  // generate common channel
  const channel = getChannel(data.to);

  // build invite
  const payload = {
    cmd: 'invite',
    channel: socket.channel,
    from: socket.userid,
    to: data.userid,
    inviteChannel: channel,
  };

  // send invite notice to target client
  server.reply(payload, targetClient);

  // send invite notice to this client
  server.reply(payload, socket);

  // stats are fun
  core.stats.increment('invites-sent');

  return true;
}

export const requiredData = [];//['nick'];
export const info = {
  name: 'invite',
  description: 'Sends an invite to the target client with the provided channel, or a random channel.',
  usage: `
    API: { cmd: 'invite', nick: '<target nickname>', to: '<optional destination channel>' }`,
};
