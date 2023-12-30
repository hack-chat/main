import fs from 'fs';
import { join, dirname } from 'path';
import { Low, JSONFile } from 'lowdb';
import { fileURLToPath } from 'url';
import { CoreApp } from 'hackchat-server';

// required file paths
const SessionLocation = './session.key';
const SaltLocation = './salt.key';
const AppConfigLocation = './config.json';

// verify required files exist
if (fs.existsSync(SessionLocation) === false) {
  throw Error('Missing session key, you may need to run: npm run config');
}

if (fs.existsSync(SaltLocation) === false) {
  throw Error('Missing salt key, you may need to run: npm run config');
}

if (fs.existsSync(AppConfigLocation) === false) {
  throw Error('Missing config, you may need to run: npm run config');
}

// build main hack chat server
const server = new CoreApp({
  configPath: './.hcserver.json',
  logErrDetailed: true,
  lang: 'en',
});

// load sessoin key data
server.sessionKey = fs.readFileSync(SessionLocation);

// load salt key data
server.saltKey = fs.readFileSync(SaltLocation);

// load the configuration data
const adapter = new JSONFile(AppConfigLocation);
server.appConfig = new Low(adapter);
await server.appConfig.read();

server.init();

console.log('Websocket server ready');
