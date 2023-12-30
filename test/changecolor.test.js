import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/core/changecolor.js';
let importedModule;

const mockPayload = {
  cmd: 'changecolor',
  color: '#000000',
}

describe('Checking changecolor module', () => {
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

  it('should be invokable by all', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: mockPayload,
    });

    expect(resp).to.be.true;
  });

  it('should check for invalid color type', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changecolor',
        color: false,
      },
    });

    expect(resp).to.be.false;
  });

  it('should check for invalid color', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changecolor',
        color: 'This is an invalid color',
      },
    });

    expect(resp).to.be.true;
  });

  it('should allow a color reset', async () => {
    const resp = await importedModule.run({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changecolor',
        color: 'reset',
      },
    });

    expect(resp).to.be.true;
  });

  it('should initialize hooks', async () => {
    expect(() => importedModule.initHooks(mocks.server)).not.to.throw();
  });

  it('should hook chat text to register /color', async () => {
    const resp = importedModule.colorCheck({
      core: mocks.core,
      server: mocks.server,
      socket: mocks.plebSocket,
      payload: {
        cmd: 'changecolor',
        color: 'reset',
      },
    });

    expect(resp).to.be.false;
  });
});