import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/speak.js';
let importedModule;

const mockPayload = {
  cmd: 'speak',
  ip: '127.0.0.1',
}

describe('Checking speak module', () => {
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

  it('should initialize', async () => {
    mocks.core.muzzledHashes = undefined;
    const resp = importedModule.init(mocks.core);

    expect(mocks.core.muzzledHashes).to.be.an('object');
  });

  it('should validate params', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'speak',
      },
    });

    expect(resp).to.be.true;
  });

  it('should accept payload.ip as a string', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'speak',
        ip: '127.0.0.1',
      },
    });

    expect(resp).to.be.true;
  });

  it('should accept payload.hash as a string', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'speak',
        hash: 'pretendthisisahash',
      },
    });

    expect(resp).to.be.true;
  });

  it('should unmuzzle all if payload.ip is *', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'speak',
        ip: '*',
      },
    });

    expect(resp).to.be.true;
  });

  it('should unmuzzle all if payload.hash is *', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'speak',
        hash: '*',
      },
    });

    expect(resp).to.be.true;
  });

});