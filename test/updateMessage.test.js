import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/updateMessage.js';
let importedModule;

const mockPayload = {
  cmd: 'updateMessage',
}

const mockChannelPayload = {
  cmd: 'updateMessage',
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

  // module main function
  it('should default the mode param if missing', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        customId: '1234',
        text: 'test',
      },
    });

    expect(resp).to.be.false;
  });

  it('should reject if mode is invalid', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        customId: '1234',
        text: 'test',
        mode: 'poop',
      },
    });

    expect(resp).to.be.false;
  });

  it('should reject if customId is missing', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: 'test',
        mode: 'overwrite',
      },
    });

    expect(resp).to.be.false;
  });

  it('should reject if customId is not text', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: 'test',
        customId: {},
        mode: 'overwrite',
      },
    });

    expect(resp).to.be.false;
  });

  it('should reject if customId is not too long', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: 'test',
        customId: `A`.repeat(importedModule.MAX_MESSAGE_ID_LENGTH * 2),
        mode: 'overwrite',
      },
    });

    expect(resp).to.be.false;
  });

  it('should reject if text is not text', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: {},
        customId: `A`,
        mode: 'overwrite',
      },
    });

    expect(resp).to.be.false;
  });

  it('should change text to null if empty', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: '',
        customId: `A`,
        mode: 'overwrite',
      },
    });

    expect(resp).to.be.false;
  });

  it('should otherwise reject empty text', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: '',
        customId: `A`,
        mode: 'prepend',
      },
    });

    expect(resp).to.be.false;
  });

  it('should delete active message records', async () => {
    const chatModule = await import('../commands/core/chat.js');

    chatModule.ACTIVE_MESSAGES.push({
      customId: 'asdf',
      userid: 1234,
      sent: 0,
      toDelete: false,
    });

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'updateMessage',
        text: 'a',
        customId: 'asdf',
        mode: 'complete',
      },
    });

    expect(resp).to.be.true;
  });

  it('should mark if sent by mod', async () => {
    const newSocket = { ...mocks.authedSocket };
    newSocket.level = 999999;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'updateMessage',
        text: 'a',
        customId: 'asdf',
        mode: 'append',
      },
    });

    expect(resp).to.be.true;
  });

  it('should mark if sent by admin', async () => {
    const newSocket = { ...mocks.authedSocket };
    newSocket.level = 9999999;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'updateMessage',
        text: 'a',
        customId: 'asdf',
        mode: 'append',
      },
    });

    expect(resp).to.be.true;
  });
  
});