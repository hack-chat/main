import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/utility/_Channels.js';
let importedModule;

describe('Checking channels module', () => {
  it('should be importable', async () => {
    importedModule = await import(modulePath);
    expect(importedModule).to.not.be.a('string');
  });

  it('should reject empty channels', async () => {
    const resp = importedModule.canJoinChannel('', {});
    expect(resp).to.be.a('number');
  });

  it('should reject too long of channels', async () => {
    const resp = importedModule.canJoinChannel('a'.repeat(121), {});
    expect(resp).to.be.a('number');
  });

  it('should get channel data', async () => {
    const newConfig = Object.assign({}, mocks.core.appConfig.data);
    newConfig.permissions['test'] = {};
    const resp = importedModule.getChannelSettings(mocks.core.appConfig.data, 'test');
    expect(resp).to.be.an('object');
  });

  it('should return empty array findUsers', async () => {
    const resp = importedModule.findUsers({}, {});
    expect(resp).to.be.an('array');
  });

  it('should limit results', async () => {
    const oldFS = mocks.server.findSockets;
    mocks.server.findSockets = (filterObj) => {
      return [1, 2, 3];
    }
    const resp = importedModule.findUsers(mocks.server, {
      userid: 1234,
    }, 1);

    mocks.server.findSockets = oldFS;

    expect(resp).to.be.an('array');
  });

  it('should respond to banned sockets', async () => {
    const newSocket = Object.assign({}, mocks.plebSocket);
    newSocket.banned = true;
    
    const resp = importedModule.canJoinChannel('test', newSocket);

    expect(resp).to.be.an('number');
  });

  it('should provide duplicate user checks', async () => {
    const newSocket = Object.assign({}, mocks.plebSocket);
    
    const resp = importedModule.socketInChannel(mocks.server, 'test', newSocket);

    expect(resp).to.be.an('object');
  });
})