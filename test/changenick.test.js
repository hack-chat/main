import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/changenick.js';
let importedModule;

const mockPayload = {
  cmd: 'changenick',
  nick: 'newNick',
}

describe('Checking changenick module', () => {
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

  it('should validate nick param', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changenick',
        nick: 1234,
      },
    });

    expect(resp).to.be.true;
  });

  it('should verify nick param', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changenick',
        nick: 'this is invalid',
      },
    });

    expect(resp).to.be.true;
  });

  it('should be invokable by all', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should prevent admin impersonation', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changenick',
        nick: 'admin',
      },
    });

    expect(resp).to.be.true;
  });
  
  it('should not update if there is no change', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changenick',
        nick: 'lies',
      },
    });

    expect(resp).to.be.true;
  });

  it('should allow them to change case', async () => {
    const origFindSockets = mocks.server.findSockets;
    mocks.server.findSockets = (filterObj) => {
      if (typeof filterObj.nick === 'function') {
        filterObj.nick('lies');
      }

      return [mocks.plebSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changenick',
        nick: 'Lies',
      },
    });

    mocks.server.findSockets = origFindSockets;

    expect(resp).to.be.true;
  });

  it('should not update if that nick exists', async () => {
    const origFindSockets = mocks.server.findSockets;
    mocks.server.findSockets = (filterObj) => {
      if (typeof filterObj.nick === 'function') {
        filterObj.nick('lies');
      }

      return [mocks.plebSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    mocks.server.findSockets = origFindSockets;

    expect(resp).to.be.true;
  });

  it('should output new user details to the channel', async () => {
    const origFindSockets = mocks.server.findSockets;
    const legacySocket = Object.assign({}, mocks.plebSocket);
    legacySocket.hcProtocol = 1;
    mocks.server.findSockets = (data) => {
      if (typeof data.nick !== 'undefined' ) {
        return [];
      }

      return [mocks.plebSocket, legacySocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    mocks.server.findSockets = origFindSockets;
    
    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should hook should validate text input', async () => {
    const resp = importedModule.nickCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: false,
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook should verify text starts with /nick', async () => {
    const resp = importedModule.nickCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: 'No slash command',
      },
    });

    expect(resp).to.be.an('object');
  });

  it('should hook should run with /nick', async () => {
    const resp = importedModule.nickCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/nick test',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook fail on mangled input', async () => {
    const resp = importedModule.nickCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/nick ',
      },
    });

    expect(resp).to.be.false;
  });
});