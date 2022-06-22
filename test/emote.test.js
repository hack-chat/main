import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/emote.js';
let importedModule;

const mockPayload = {
  cmd: 'emote',
  channel: 'cake',
  text: 'testing',
}

describe('Checking emote module', () => {
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

  it('should not accept empty text', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'emote',
        text: false,
      },
    });

    expect(resp).to.be.false;
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
  
  it('should include a users trip', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.trip = 'test';

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should hook a /me text command, verifying params', async () => {
    const resp = importedModule.emoteCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: {
        cmd: 'chat',
        text: false,
      },
    });

    expect(resp).to.be.false;
  });
});