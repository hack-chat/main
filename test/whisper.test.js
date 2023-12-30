import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/whisper.js';
let importedModule;

const mockPayload = {
  cmd: 'whisper',
  text: 'testing',
  userid: 1234,
  nick: 'test',
}

describe('Checking whisper module', () => {
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

  it('should reject invalid text', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'whisper',
        text: false,
      },
    });

    expect(resp).to.be.false;
  });

  it('should handle legacy users', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
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

  it('should handle 404 users', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    mocks.server.findSockets = (filterObj) => {
      return false;
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should handle legacy users in', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    mocks.server.findSockets = (filterObj) => {
      return [mocks.authedSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should handle legacy users out', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    mocks.server.findSockets = (filterObj) => {
      return [newSocket];
    }

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should handle users out', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);

    mocks.server.findSockets = (filterObj) => {
      return [newSocket];
    }

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

  it('should hook for /whisper chat commands, verifying params', async () => {
    const resp = importedModule.whisperCheck({
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

  it('should hook for /whisper chat commands', async () => {
    const resp = importedModule.whisperCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/whisper user stuff',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook for /w chat commands', async () => {
    const resp = importedModule.whisperCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/w user stuff',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook for /w chat commands, validating params', async () => {
    const resp = importedModule.whisperCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/whisper ',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook for /reply chat commands', async () => {
    const resp = importedModule.whisperCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/reply ',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook for /r chat commands', async () => {
    const resp = importedModule.whisperCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: '/r ',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook only certain triggers', async () => {
    const resp = importedModule.whisperCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        text: 'normal text',
      },
    });

    expect(resp).to.be.an('object');
  });
});