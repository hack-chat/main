import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/chat.js';
let importedModule;

const mockPayload = {
  cmd: 'chat',
  channel: 'cake',
  text: 'testing',
}

describe('Checking chat module', () => {
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

  it('should ratelimit on invalid text', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
          cmd: 'chat',
          channel: 'cake',
          text: [],
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

  it('should add sender admin label', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should add sender mod label', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.level = 999999;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should add color', async () => {
    const newSocket = Object.assign({}, mocks.plebSocket);
    newSocket.color = '000000';

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should reject too long of customId', async () => {
    const newPayload = { ...mockPayload };
    newPayload.customId = '1234567890';

    const newSocket = { ...mocks.plebSocket };
    newSocket.color = '000000';

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: newPayload,
    });

    expect(resp).to.be.false;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should hook for / based commands', async () => {
    const resp = importedModule.commandCheckIn({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.an('object');
  });

  it('should validate hook text param', async () => {
    const resp = importedModule.commandCheckIn({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        channel: 'cake',
        text: false,
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook for /myhash', async () => {
    const resp = importedModule.commandCheckIn({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        channel: 'cake',
        text: '/myhash',
      },
    });

    expect(resp).to.be.false;
  });

  it('should hook for failed / commands, validating text input', async () => {
    const resp = importedModule.finalCmdCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        channel: 'cake',
        text: false,
      },
    });

    expect(resp).to.be.false;
  });

  it('should final hook should ignore if input doesnt start with /', async () => {
    const resp = importedModule.finalCmdCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'chat',
        channel: 'cake',
        text: 'test',
      },
    });

    expect(resp).to.be.an('object');
  });

  it('should cleanup old active messages', async () => {
    importedModule.ACTIVE_MESSAGES.push({
      customId: '1234',
      userid: 1234,
      sent: 0,
      toDelete: false,
    });

    expect(() => importedModule.cleanActiveMessages()).not.to.throw();
  });
});