/*
  Description: Create a new socket session or restore previous session
*/

// module support functions
const createSessionID = () => {
  let sessionID = '';
  for( let i = 0, j = 32; i < j; i++) {
    sessionID += Math.random().toString(36).substr(2, 9);
  }
  return sessionID;
}

// module main
export async function run(core, server, socket) {
  // gather connection and channel count
  let ips = {};
  let channels = {};
  // todo: use public channel flag 
  let publicChanCounts = {
    lounge: 0,
    meta: 0,
    math: 0,
    physics: 0,
    chemistry: 0,
    technology: 0,
    programming: 0,
    games: 0,
    banana: 0,
    chinese: 0,
  };

  // todo: code resuage between here and `morestats`, export function
  server.clients.forEach((client) => {
    if (client.channel) {
      channels[client.channel] = true;
      ips[client.address] = true;
      if (typeof publicChanCounts[client.channel] !== 'undefined') {
        publicChanCounts[client.channel]++;
      }
    }
  });

  const uniqueClientCount = Object.keys(ips).length;
  const uniqueChannels = Object.keys(channels).length;

  ips = null;
  channels = null;

  // @todo: restore session
  socket.sessionID = createSessionID();
  socket.hcProtocol = 2;
  socket.userid = Math.floor(Math.random() * 9999999999999);

  // dispatch info
  server.reply({
    cmd: 'session',
    users: uniqueClientCount,
    chans: uniqueChannels,
    public: publicChanCounts,
    sessionID: socket.sessionID,
    restored: false,
  }, socket);
}

export const info = {
  name: 'session',
  description: 'Restore previous state by session id or return new session id (currently unavailable)',
  usage: `
    API: { cmd: 'session', id: '<previous session>' }`
};
