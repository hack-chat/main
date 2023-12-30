import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/lockroom.js';
let importedModule;

const targetChannel = 'test';

const mockPayload = {
  cmd: 'lockroom',
}

const mockChannelPayload = {
  cmd: 'lockroom',
  channel: targetChannel,
}

const mockBadChatPayload = {
  cmd: 'chat',
  text: {},
}

const mockChatPayload = {
  cmd: 'chat',
  text: 'asdf',
}

const mockJoinPayload = {
  cmd: 'join',
  nick: 'test#test',
  channel: 'test',
}

const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Checking lockroom module', () => {
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

  it('should fail if already enabled', async () => {
    mocks.core.locked = { test: true };

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockChannelPayload,
    });

    mocks.core.locked = {};

    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  // change nick hook checks
  it('should prevent name changes in purgatory channel', async () => {
    const origChannel = mocks.authedSocket.channel;
    mocks.authedSocket.channel = 'purgatory';

    const resp = await importedModule.changeNickCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changenick',
        nick: 'test',
      },
    });

    mocks.authedSocket.channel = origChannel;

    expect(resp).to.be.false;
  });

  it('should ignore name changes in other channels', async () => {
    const resp = await importedModule.changeNickCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'changenick',
        nick: 'test',
      },
    });

    expect(resp).to.be.an('object');
  });

  // whisper hook checks
  it('should prevent whispers in purgatory channel', async () => {
    const origChannel = mocks.authedSocket.channel;
    mocks.authedSocket.channel = 'purgatory';

    const resp = await importedModule.whisperCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'whisper',
      },
    });

    mocks.authedSocket.channel = origChannel;

    expect(resp).to.be.false;
  });

  it('should ignore whispers in other channels', async () => {
    const resp = await importedModule.whisperCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'whisper',
      },
    });

    expect(resp).to.be.an('object');
  });

  // chat hook checks
  it('should prevent chats in purgatory channel', async () => {
    const plebSocket = { ...mocks.plebSocket };
    plebSocket.channel = 'purgatory';

    const resp = await importedModule.chatCheck({
      socket: plebSocket,
      payload: {
        cmd: 'chat',
        text: 'test',
      },
    });

    expect(resp).to.be.false;
  });

  it('should allow mods to speak though', async () => {
    const origChannel = mocks.authedSocket.channel;
    mocks.authedSocket.channel = 'purgatory';

    const resp = await importedModule.chatCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'chat',
        text: 'test',
      },
    });

    mocks.authedSocket.channel = origChannel;

    expect(resp).to.be.an('object');
  });

  it('should ignore chats in other channels', async () => {
    const resp = await importedModule.chatCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'chat',
        text: 'test',
      },
    });

    expect(resp).to.be.an('object');
  });

  // invite hook checks
  it('should prevent invites in purgatory channel', async () => {
    const plebSocket = { ...mocks.plebSocket };
    plebSocket.channel = 'purgatory';

    const resp = await importedModule.inviteCheck({
      socket: plebSocket,
      payload: {
        cmd: 'chat',
        text: 'test',
      },
    });

    expect(resp).to.be.false;
  });

  it('should ignore invites in other channels', async () => {
    const resp = await importedModule.inviteCheck({
      socket: mocks.authedSocket,
      payload: {
        cmd: 'chat',
        text: 'test',
      },
    });

    expect(resp).to.be.an('object');
  });

  // join hook checks
  it('should ignore join if no lock record', async () => {
    mocks.core.locked = {};

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'join',
        channel: 'test',
        nick: 'test',
        pass: 'test',
      },
    });

    expect(resp).to.be.an('object');
  });

  it('should ignore join if not locked or purgatory', async () => {
    mocks.core.locked = { test: false };

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'join',
        channel: 'test',
        nick: 'test',
        pass: 'test',
      },
    });

    expect(resp).to.be.an('object');
  });

  it('should allow v2 into purgatory', async () => {
    const plebSocket = { ...mocks.plebSocket };
    plebSocket.channel = 'used';
    mocks.core.locked = {};

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mocks.server,
      socket: plebSocket,
      payload: {
        cmd: 'join',
        channel: 'purgatory',
        nick: 'test',
      },
    });

    expect(resp).to.be.true;
  });

  it('should allow v1 into purgatory', async () => {
    const plebSocket = { ...mocks.plebSocket };
    plebSocket.channel = undefined;
    plebSocket.hcProtocol  = undefined;
    mocks.core.locked = {};

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mocks.server,
      socket: plebSocket,
      payload: {
        cmd: 'join',
        channel: 'purgatory',
        nick: 'thisnameistoolongandwillberejected',
      },
    });

    expect(resp).to.be.true;
  });

  it('should wait for the timeout to run', async () => {
    const mockServer = { ...mocks.server };
    const plebSocket = { ...mocks.plebSocket };

    plebSocket.channel = undefined;
    plebSocket.hcProtocol  = undefined;
    mocks.core.locked = {};

    mockServer.reply = () => {};

    await importedModule.joinCheck({
      core: mocks.core,
      server: mockServer,
      socket: plebSocket,
      payload: {
        cmd: 'join',
        channel: 'purgatory',
        nick: 'test',
      },
    });
  });

  it('should do channel checking', async () => {
    const plebSocket = { ...mocks.plebSocket };
    plebSocket.channel = undefined;
    plebSocket.hcProtocol  = undefined;
    plebSocket.banned = true;
    mocks.core.locked = {};

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mocks.server,
      socket: plebSocket,
      payload: {
        cmd: 'join',
        channel: 'purgatory',
        nick: 'test',
        pass: 'test',
      },
    });

    expect(resp).to.be.true;
  });

  it('should use dante if not needed', async () => {
    const mockServer = { ...mocks.server };
    const plebSocket = { ...mocks.plebSocket };

    plebSocket.channel = undefined;
    plebSocket.hcProtocol  = undefined;
    mocks.core.locked = { lockedChan: true };

    mockServer.reply = () => {};

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mockServer,
      socket: plebSocket,
      payload: {
        cmd: 'join',
        channel: 'lockedChan',
        nick: 'test',
      },
    });
  });
});