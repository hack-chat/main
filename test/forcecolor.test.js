import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/forcecolor.js';
let importedModule;

const mockPayload = {
  cmd: 'forcecolor',
  userid: 1234,
  color: '#000000',
}

describe('Checking forcecolor module', () => {
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

  it('should check for invalid nick', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: false,
        color: false,
      },
    });

    expect(resp).to.be.true;
  });

  it('should check for invalid color', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: 'lies',
        color: false,
      },
    });

    expect(resp).to.be.true;
  });

  it('should check accept color reset', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: 'lies',
        color: 'reset',
      },
    });

    expect(resp).to.be.true;
  });

  it('should check accept color', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: 'lies',
        color: 'invalid color',
      },
    });

    expect(resp).to.be.true;
  });

  it('should handle users not found', async () => {
    const oldFS = mocks.server.findSockets;
    mocks.server.findSockets = (filterObj) => {
      return false;
    }
    
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: 'lies',
        color: '#000000',
      },
    });

    mocks.server.findSockets = oldFS;

    expect(resp).to.be.true;
  });

  it('should alert to invalid user', async () => {
    const oldFS = mocks.server.findSockets;
    mocks.server.findSockets = (filterObj) => {
      return [mocks.plebSocket];
    }
    
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: 'lies',
        color: '#000000',
      },
    });
    
    mocks.server.findSockets = oldFS;

    expect(resp).to.be.true;
  });

  it('should not color mods', async () => {
    const oldFS = mocks.server.findSockets;
    mocks.server.findSockets = (filterObj) => {
      return [mocks.authedSocket];
    }
    
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changecolor',
        nick: 'lies',
        color: '#000000',
      },
    });
    
    mocks.server.findSockets = oldFS;

    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should validate chat text in hook', async () => {
    const resp = importedModule.colorCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'chat',
      },
    });

    expect(resp).to.be.false;
  });
});