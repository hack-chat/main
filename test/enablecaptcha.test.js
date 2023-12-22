import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/mod/enablecaptcha.js';
let importedModule;

const targetChannel = 'test';

const mockPayload = {
  cmd: 'enablecaptcha',
}

const mockChannelPayload = {
  cmd: 'enablecaptcha',
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

describe('Checking enablecaptcha module', () => {
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
    mocks.core.captchas = undefined;
    const resp = importedModule.init(mocks.core);

    expect(mocks.core.captchas).to.be.an('object');
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
    const origCaptchas = mocks.core.captchas;
    mocks.core.captchas = { [mocks.authedSocket.channel]: true };

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    mocks.core.captchas = origCaptchas;

    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should reject chat if not text', async () => {
    const resp = await importedModule.chatCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockBadChatPayload,
    });

    expect(resp).to.be.false;
  });

  it('should return if channel is not enabled', async () => {
    const resp = await importedModule.chatCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockChatPayload,
    });

    expect(resp).to.be.an('object');
  });

  it('should disconnect on failed captcha', async () => {
    mocks.authedSocket.captcha = {};
    mocks.authedSocket.captcha.awaiting = true;

    const resp = await importedModule.chatCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockChatPayload,
    });

    expect(resp).to.be.false;
  });

  it('should join with correct phrase', async () => {
    mocks.authedSocket.captcha = {};
    mocks.authedSocket.captcha.awaiting = true;
    mocks.authedSocket.captcha.solution = mockChatPayload.text;

    const resp = await importedModule.chatCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockChatPayload,
    });

    expect(resp).to.be.false;
  });

  it('should handle legacy clients', async () => {
    mocks.authedSocket.captcha = {};
    mocks.authedSocket.captcha.awaiting = true;
    mocks.authedSocket.captcha.solution = mockChatPayload.text;

    const origProtocol = mocks.authedSocket.hcProtocol;
    mocks.authedSocket.hcProtocol = 1;

    const resp = await importedModule.chatCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockChatPayload,
    });

    mocks.authedSocket.hcProtocol = origProtocol;

    expect(resp).to.be.false;
  });

  it('should hook join commands', async () => {
    mocks.core.captchas = {};

    const resp = await importedModule.joinCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockJoinPayload,
    });

    expect(resp).to.be.an('object');
  });
  
});