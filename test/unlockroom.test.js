import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/unlockroom.js';
let importedModule;

const mockPayload = {
  cmd: 'unlockroom',
}

const mockChannelPayload = {
  cmd: 'unlockroom',
  channel: 'test',
}

describe('Checking unlockroom module', () => {
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

  it('should initialize', async () => {
    mocks.core.locked = undefined;
    const resp = importedModule.init(mocks.core);

    expect(mocks.core.locked).to.be.an('object');
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

  it('should accept a channel param', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockChannelPayload,
    });

    expect(resp).to.be.true;
  });

  it('should accept no channel param', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should fail on missing channel data', async () => {
    const origChannel = mocks.authedSocket.channel;
    mocks.authedSocket.channel = undefined;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    mocks.authedSocket.channel = origChannel;

    expect(resp).to.be.false;
  });

  it('should unlock if locked', async () => {
    mocks.core.locked = { [mocks.authedSocket.channel]: true };

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });
  
});