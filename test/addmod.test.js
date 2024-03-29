import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/admin/addmod.js';
let importedModule;

const mockPayload = {
  cmd: 'addmod',
  trip: 'newTrip',
}

describe('Checking addmod module', () => {
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
  it('should be invokable only by an admin', async () => {
    const newCore = Object.assign({}, mocks.core);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.false;
  });

  it('should add new trip to the config', async () => {
    const newCore = Object.assign({}, mocks.core);

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });

    expect(mocks.core.appConfig.data.globalMods[0].trip).to.equal(mockPayload.trip);
  });

  it('should inform the new mod', async () => {
    const newCore = Object.assign({}, mocks.core);
    mocks.server.findSockets = () => {
      return [{}];
    }

    const resp = await importedModule.run({
      core: newCore,
      server: mocks.server,
      socket: mocks.authedSocket,
      payload: mockPayload,
    });
    
    expect(resp).to.be.true;
  });
});