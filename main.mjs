import {
  existsSync,
  readFileSync,
} from 'node:fs';
import {
  Low,
  JSONFile,
} from 'lowdb';
import {
  CoreApp,
} from 'hackchat-server';

// required file paths
const SessionLocation = './session.key';
const SaltLocation = './salt.key';
const AppConfigLocation = './config.json';

// verify required files exist
if (existsSync(SessionLocation) === false) {
  throw Error('Missing session key, you may need to run: npm run config');
}

if (existsSync(SaltLocation) === false) {
  throw Error('Missing salt key, you may need to run: npm run config');
}

if (existsSync(AppConfigLocation) === false) {
  throw Error('Missing config, you may need to run: npm run config');
}

// build main hack chat server
const server = new CoreApp({
  configPath: './.hcserver.json',
  logErrDetailed: true,
  lang: 'en',
});

// load sessoin key data
server.sessionKey = readFileSync(SessionLocation);

// load salt key data
server.saltKey = readFileSync(SaltLocation);

// load the configuration data
const adapter = new JSONFile(AppConfigLocation);
server.appConfig = new Low(adapter);
await server.appConfig.read();

server.init();

console.log('Websocket server ready');
