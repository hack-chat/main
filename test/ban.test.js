import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/ban.js';
let importedModule;

const mockPayload = {
  cmd: 'ban',
  userid: 1234,
}

describe('Checking ban module', () => {
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

  it('should check for invalid legacy params', async () => {
    mocks.authedSocket.hcProtocol = 1;
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.false;
  });

  it('should verify legacy params', async () => {
    mocks.authedSocket.hcProtocol = 1;
    mockPayload.nick = 5431;
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.false;
  });

  it('should accept legacy params', async () => {
    mocks.authedSocket.hcProtocol = 1;
    mockPayload.nick = 'lies';
    mocks.server.findSockets = (filterObj) => {
      return false;
    }
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should check for invalid params', async () => {
    mocks.authedSocket.hcProtocol = 2;
    mockPayload.userid = 'test';
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.false;
  });

  it('should not ban mods', async () => {
    mocks.authedSocket.hcProtocol = 2;
    mockPayload.userid = 1234;

    mocks.server.findSockets = (filterObj) => {
      return [mocks.authedSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should blacklist the ip', async () => {
    mocks.authedSocket.hcProtocol = 2;
    mockPayload.userid = 1234;

    mocks.server.findSockets = (filterObj) => {
      if (typeof filterObj.level === 'function') {
        filterObj.level();
      }
      
      return [mocks.plebSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });
    
    expect(mocks.server.police.addresses[0]).to.be.a('string');
  });
  
});