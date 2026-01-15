const mocks = {
  core: {
    sessionKey: 'test',

    appConfig: {
      data: {
        globalMods: [],
        permissions: [],
        channels: {
          test: {
            owned: false,
          }
        },
        tripSalt: 'test',
        adminTrip: '',
      },
      write: async () => '',
    },

    muzzledHashes: [],

    stats: {
      increment: () => 1,
      decrement: () => 1,
      get: () => 1,
      set: () => 1,
    },

    dynamicImports: {
      reloadDirCache: () => '',
    },

    commands: {
      reloadCommands: () => '',
      handleCommand: () => '',
      commands: [],
      categoriesList: ['test'],
      all: () => [{
        info: {
          name: 'test',
          category: 'test',
        },
      }],
      get: (name) => {
        if (name === 'undef') {
          return undefined;
        } else if(name === 'noalias') {
          return {
            info: {
              name: 'test',
              category: 'test',
            }
          }
        } else {
          return {
            info: {
              name: 'test',
              category: 'test',
              aliases: ['testing'],
            }
          }
        }
      },
    },

    configManager: {
      save: () => true,
    },
  },

  server : {
    police: {
      addresses: [],
      frisk: () => false,
      arrest: (address) => mocks.server.police.addresses.push(address),
    },
    findSockets: () => [],
    reply: () => true,
    broadcast: (data, filterObj) => {
      if (typeof filterObj.level === 'function') {
        filterObj.level();
      }

      return true;
    },
    send: () => true,
    cmdKey: 'test',
    registerHook: () => true,
    loadHooks: () => true,
    clients: [{
      channel: 'cake',
      address: '127.0.0.1',
    }],
    getSocketHash: () => 'test',
  },

  plebSocket: {
    level: 100,
    address: '127.0.0.1',
    channel: 'cake',
    channels: [],
    terminate: () => true,
    nick: 'lies',
    hcProtocol: 2,
    hash: 'testHash',
    uType: 'user',
    userid: 1234,
  },

  authedSocket: {
    level: 9999999,
    address: '127.0.0.1',
    channel: 'cake',
    channels: [],
    terminate: () => true,
    hcProtocol: 2,
    nick: '[ignore this]',
    trip: 'and this',
    hash: 'testHash',
    uType: 'admin',
    userid: 1234,
  },
};

export default mocks;
