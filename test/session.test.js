import { expect } from 'chai';
import jsonwebtoken from 'jsonwebtoken';
import mocks from './mockImports.js';

const modulePath = '../commands/core/session.js';
let importedModule;

const mockPayload = {
  cmd: 'session',
  token: 'testing',
}

describe('Checking session module', () => {
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

  it('should initialize', async () => {
    const resp = importedModule.init(mocks.core);
    expect(mocks.core).to.be.an('object');
  });

  it('should provide current session string', async () => {
    const newCore = Object.assign({}, mocks.core);

    const resp = await importedModule.getSession(mocks.plebSocket, newCore);

    expect(resp).to.be.a('string');
  });

  it('should be invokable', async () => {
    expect(importedModule.run).to.be.a('function');
  });

  it('should initialize', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = undefined;
    const resp = importedModule.init(newCore);

    expect(newCore.sessionKey).to.not.equal(undefined);
  });

  // module main function
  it('should be invokable by all', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.false;
  });

  it('should notify about required token', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
      },
    });

    expect(resp).to.be.false;
  });

  it('should notify about invalid token', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: 'false',
      },
    });

    expect(resp).to.be.false;
  });

  it('should accept valid token', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      nick: 'test',
      channel: 'test',
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });

  it('should require a session channel value', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      test: 'test',
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });

  it('should require session channels value', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      channel: 'test',
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });

  it('should require session color value', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      channel: 'test',
      channels: ['test'],
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });

  it('should require session isBot value', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      channel: 'test',
      channels: ['test'],
      color: 'ffffff',
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });

  it('should require session level value', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      channel: 'test',
      channels: ['test'],
      color: 'ffffff',
      isBot: false,
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });

  it('should require session level value', async () => {
    const newCore = Object.assign({}, mocks.core);
    newCore.sessionKey = 'test';
    const token = jsonwebtoken.sign({
      channel: 'test',
      channels: ['test'],
      color: 'ffffff',
      isBot: false,
      nick: 'test',
    }, newCore.sessionKey);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'session',
        token: token,
      },
    });

    expect(resp).to.be.false;
  });
});