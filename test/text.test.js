import { expect } from 'chai';
import mocks from './mockImports.js';

const modulePath = '../commands/utility/_Text.js';
let importedModule;

describe('Checking _Text module', () => {
  // module meta data
  it('should be importable', async () => {
    importedModule = await import(modulePath);
    expect(importedModule).to.not.be.a('string');
  });

  it('should return null if not text', () => {
    const resp = importedModule.parseText([]);
    
    expect(resp).to.be.null;
  });
});