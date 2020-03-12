/*
  Description: Create a new socket session or restore previous session
*/

// module main
export async function run() { }

export const info = {
  name: 'session',
  description: 'Restore previous state by session id or return new session id (currently unavailable)',
  usage: `
    API: { cmd: 'session', id: '<previous session>' }`
};
