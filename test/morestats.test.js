import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/morestats.js';
let importedModule;

const mockPayload = {
  cmd: 'morestats',
  channel: 'cake',
}

describe('Checking morestats module', () => {
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
    const newSocket = Object.assign({}, mocks.plebSocket);
    newSocket.channel = 'programming';
    mocks.server.clients = [
      newSocket,
    ];
    mocks.core.stats.get = (type) => {
      if (type === 'start-time') {
        return process.hrtime();
      }

      return false;
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should validate params with /stats', async () => {
    const resp = importedModule.statsCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
      },
    });

    expect(resp).to.be.false;
  });

  it('should run with /stats', async () => {
    const resp = importedModule.statsCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/stats',
      },
    });

    expect(resp).to.be.false;
  });

});