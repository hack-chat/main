import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/join.js';
let importedModule;

const mockPayload = {
  cmd: 'join',
  channel: 'cake',
  text: 'testing',
}

describe('Checking join module', () => {
  // module meta data
  it('should be importable', async () => {
    importedModule = await import(modulePath);
    expect(importedModule).to.not.be.a('string');
  });
  
  it('should be named', async () => {
    expect(importedModule.info.name).to.be.a('string');
  });

  it('should be categorized', async () => {
    expect(importedModule.info.category).to.be.a('string');
  });

  it('should be described', async () => {
    expect(importedModule.info.description).to.be.a('string');
  });

  it('should be documented', async () => {
    expect(importedModule.info.usage).to.be.a('string');
  });

  it('should be invokable', async () => {
    expect(importedModule.run).to.be.a('function');
  });

  // module main function
  it('should be invokable by all', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should ratelimit if required', async () => {
    const oldRL = mocks.server.police.frisk;
    mocks.server.police.frisk = () => true;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    mocks.server.police.frisk = oldRL;

    expect(resp).to.be.true;
  });

  it('should upgrade legacy users', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = undefined;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 'test#test',
        channel: 'cake',
      },
    });

    expect(resp).to.be.true;
  });

  it('should fail on invalid channels', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = undefined;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 'test#test',
        channel: false,
      },
    });

    expect(resp).to.be.true;
  });

  it('should allow join only if not already joined', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.channel = undefined;
    newSocket.hcProtocol = undefined;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 'test#test',
        channel: 'cake',
      },
    });

    expect(resp).to.be.true;
  });

  it('should allow join only user has a valid name', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.channel = undefined;
    newSocket.hcProtocol = undefined;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 't e s t#test',
        channel: 'cake',
      },
    });

    expect(resp).to.be.true;
  });

  it('should prevent admin impersonation', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.channel = undefined;
    newSocket.hcProtocol = undefined;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 'admin#test',
        channel: 'cake',
      },
    });

    expect(resp).to.be.true;
  });

  it('should prevent two of the same name in the same channel', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.channel = undefined;
    newSocket.hcProtocol = undefined;

    mocks.server.findSockets = (filterObj) => {
      return false;
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 'admin#test',
        channel: 'cake',
      },
    });

    expect(resp).to.be.true;
  });

  it('should announce new user', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.channel = undefined;
    newSocket.hcProtocol = undefined;

    mocks.server.findSockets = (filterObj) => {
      if (filterObj.nick) {
        if (typeof filterObj.nick === 'function') {
          filterObj.nick('nick');
        }

        return false;
      } else {
        return [mocks.plebSocket];
      }
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'join',
        nick: 'admin#test',
        channel: 'cake',
      },
    });

    expect(resp).to.be.true;
  });

  it('should restore a join', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);

    const resp = await importedModule.restoreJoin({
      server: mocks.server,
      socket: newSocket,
      channel: 'test',
    });

    expect(resp).to.be.true;
  });

  it('should accept a restoration refusal', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.banned = true;

    const resp = await importedModule.restoreJoin({
      server: mocks.server,
      socket: newSocket,
      channel: 'test',
    });

    expect(resp).to.be.true;
  });

  it('should account for duplicate connections', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    const newServer = Object.assign({}, mocks.server);
    const origFindSockets = mocks.server.findSockets;

    newServer.findSockets = (filterObj) => {
      if (typeof filterObj.nick !== 'undefined') {
        filterObj.nick('nick');
      }
      return [mocks.authedSocket];
    }

    const resp = await importedModule.restoreJoin({
      server: newServer,
      socket: newSocket,
      channel: 'test',
    });

    mocks.server.findSockets = origFindSockets;

    expect(resp).to.be.true;
  });

  it('should handle non-duplicate connections', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    const newServer = Object.assign({}, mocks.server);
    const origFindSockets = mocks.server.findSockets;
    let alreadyRan = false;

    newServer.findSockets = (filterObj) => {
      if (alreadyRan === false) {
        alreadyRan = true;
        return [mocks.authedSocket];
      }

      return [];
    }

    const resp = await importedModule.restoreJoin({
      server: newServer,
      socket: newSocket,
      channel: 'test',
    });

    mocks.server.findSockets = origFindSockets;

    expect(resp).to.be.true;
  });
});