import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/utility/_UAC.js';
let importedModule;

describe('Checking UAC module', () => {
  it('should be importable', async () => {
    importedModule = await import(modulePath);
    expect(importedModule).to.not.be.a('string');
  });

  it('should handle channel owners', async () => {
    const resp = importedModule.isChannelOwner(9999999);
    expect(resp).to.be.true;
  });

  it('should handle channel mods', async () => {
    const resp = importedModule.isChannelModerator(9999999);
    expect(resp).to.be.true;
  });

  it('should handle channel mods', async () => {
    const resp = importedModule.isChannelTrusted(9999999);
    expect(resp).to.be.true;
  });

  it('should handle channel mods', async () => {
    const resp = importedModule.isTrustedUser(9999999);
    expect(resp).to.be.true;
  });

  it('should return false on bad nickname', async () => {
    const resp = importedModule.verifyNickname();
    expect(resp).to.be.false;
  });

  it('should return default perms', async () => {
    const resp = importedModule.getUserPerms(false);
    expect(resp).to.be.an('object');
  });

  it('should return admin level labels', async () => {
    const newConfig = Object.assign({}, mocks.core.appConfig.data);
    newConfig.adminTrip = 'Tt8H7c';
    const resp = importedModule.getUserPerms('test', 'salt', newConfig, 'cake');
    expect(resp).to.be.an('object');
  });

  it('should return mod level labels', async () => {
    const newConfig = Object.assign({}, mocks.core.appConfig.data);
    newConfig.globalMods = [{
        trip: 'Tt8H7c',
    }];
    const resp = importedModule.getUserPerms('test', 'salt', newConfig, 'cake');
    expect(resp).to.be.an('object');
  });

  it('should return ownership info', async () => {
    const newConfig = Object.assign({}, mocks.core.appConfig.data);
    newConfig.permissions['cake'] = {
        owned: true,
    };
    const resp = importedModule.getUserPerms('test', 'salt', newConfig, 'cake');
    expect(resp).to.be.an('object');
  });
})