import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/utility/_LegacyFunctions.js';
let importedModule;

describe('Checking legacyFunctions module', () => {
  it('should be importable', async () => {
    importedModule = await import(modulePath);
    expect(importedModule).to.not.be.a('string');
  });

  it('should handle pass and password', async () => {
    const resp = importedModule.upgradeLegacyJoin(mocks.server, mocks.plebSocket, {
      nick: 'test#test',
      password: 'test',
    });
    expect(resp).to.be.an('object');
  });

  it('should handle mod label', async () => {
    const resp = importedModule.legacyLevelToLabel(9999999);
    expect(resp).to.equal('admin');
  });

  it('should handle mod label', async () => {
    const resp = importedModule.legacyLevelToLabel(999999);
    expect(resp).to.equal('mod');
  });

  it('should provide duplicate user checks', async () => {
    const newSocket = Object.assign({}, mocks.plebSocket);
    newSocket.trip = false;
    
    const resp = importedModule.legacyWhisperOut({
      cmd: 'whisper', 
    }, newSocket);

    expect(resp).to.be.an('object');
  });

  it('should apply missing user id', async () => {
    const newSocket = Object.assign({}, mocks.authedSocket);
    newSocket.userid = undefined;

    const resp = importedModule.upgradeLegacyJoin(mocks.server, newSocket, {
      nick: 'test#test',
      password: 'test',
    });
    expect(resp).to.be.an('object');
  });
})