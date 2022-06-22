import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/kick.js';
let importedModule;

const mockPayload = {
  cmd: 'kick',
  userid: 1234,
  to: 'no_cake',
}

describe('Checking kick module', () => {
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
  it('should be invokable only by a mod', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.false;
  });

  it('should validate legacy params', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'kick',
      },
    });

    expect(resp).to.be.true;
  });

  it('should handle no users found', async () => {
    mocks.authedSocket.hcProtocol = 2;
    mocks.server.findSockets = (filterObj) => {
      if (typeof filterObj.nick === 'function') {
        filterObj.nick('lies');
      }

      return [];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'kick',
        userid: 1234,
        to: 'test',
      },
    });

    expect(resp).to.be.true;
  });

  it('should validate params', async () => {
    mocks.server.findSockets = (filterObj) => {
      if (typeof filterObj.nick === 'function') {
        filterObj.nick('lies');
      }

      return [mocks.plebSocket];
    }

    mocks.authedSocket.hcProtocol = 2;
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'kick',
        userid: false,
      },
    });

    expect(resp).to.be.true;
  });

  it('should accept a "to" param', async () => {
    mocks.authedSocket.hcProtocol = 2;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'kick',
        userid: 1234,
        to: 'test',
      },
    });

    expect(resp).to.be.true;
  });

  it('should kick to random channel', async () => {
    mocks.authedSocket.hcProtocol = 2;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'kick',
        userid: 1234,
      },
    });

    expect(resp).to.be.true;
  });

  it('should not kick mods', async () => {
    mocks.authedSocket.hcProtocol = 2;
    mocks.server.findSockets = (filterObj) => {
      if (typeof filterObj.nick === 'function') {
        filterObj.nick('lies');
      }

      return [mocks.authedSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'kick',
        userid: 1234,
        to: 'test',
      },
    });

    expect(resp).to.be.true;
  });
});