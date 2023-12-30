import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/invite.js';
let importedModule;

const mockPayload = {
  cmd: 'invite',
  channel: 'cake',
  text: 'testing',
}

describe('Checking invite module', () => {
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

  // module export functions
  it('should export a random channel function', async () => {
    const resp = importedModule.getChannel();

    expect(resp).to.be.a('string');
  });

  it('should export a common channel function', async () => {
    const resp = importedModule.getChannel('common');

    expect(resp).to.be.a('string');
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

  it('should validate channel legacy param', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        nick: 'test',
      },
    });

    expect(resp).to.be.true;
  });

  it('should validate nick legacy param', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        channel: 1234,
      },
    });

    expect(resp).to.be.true;
  });

  it('should validate userid param', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 2;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        userid: 1234,
      },
    });

    expect(resp).to.be.true;
  });

  it('should validate channel param', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 2;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        channel: 1234,
      },
    });

    expect(resp).to.be.true;
  });

  it('should handle user 404', async () => {
    const oldFS = mocks.server.findSockets;
    mockPayload.nick = 'lies';
    mocks.server.findSockets = (filterObj) => {
      return false;
    }
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        channel: 'cake',
        nick: 'lies',
        userid: 1234,
      },
    });

    mocks.server.findSockets = oldFS;

    expect(resp).to.be.true;
  });

  it('should handle legacy users', async () => {
    const oldFS = mocks.server.findSockets;
    mockPayload.nick = 'lies';
    mocks.server.findSockets = (filterObj) => {
      return [{
        hcProtocol: 1,
      }];
    }
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 1;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        channel: 'cake',
        nick: 'lies',
        userid: 1234,
      },
    });

    mocks.server.findSockets = oldFS;

    expect(resp).to.be.true;
  });

  it('should handle invites', async () => {
    const oldFS = mocks.server.findSockets;
    mockPayload.nick = 'lies';
    mocks.server.findSockets = (filterObj) => {
      return [{
        hcProtocol: 2,
      }];
    }
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.hcProtocol = 2;

    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: newSocket,
      payload: {
        cmd: 'invite',
        channel: 'cake',
        nick: 'lies',
        userid: 1234,
      },
    });

    mocks.server.findSockets = oldFS;

    expect(resp).to.be.true;
  });
});