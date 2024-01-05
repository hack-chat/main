/* eslint-disable no-await-in-loop */
/* eslint import/no-unresolved: 0 */

import {
  existsSync,
  readFileSync,
  writeFile,
  writeFileSync,
} from 'node:fs';
import {
  createHash,
} from 'node:crypto';
import {
  Low,
  JSONFile,
} from 'lowdb';
import crypto from 'crypto';
import enquirerPkg from 'enquirer';

const {
  Select,
  Confirm,
  Password,
  Input,
} = enquirerPkg;

// required file paths
const SessionLocation = './session.key';
const SaltLocation = './salt.key';
const AppConfigLocation = './config.json';

// default configuration options
const defaultConfig = {
  adminTrip: '',
  globalMods: [],
  publicChannels: [],
  permissions: [],
};

// standard / default channel list
const defaultChannels = [
  'lounge',
  'meta',
  'math',
  'physics',
  'chemistry',
  'technology',
  'programming',
  'games',
  'banana',
];

// load the configuration data
const adapter = new JSONFile(AppConfigLocation);
const config = new Low(adapter);

// check for missing cert, generate if needed
const checkCert = async () => {
  if (existsSync(SessionLocation) === false) {
    const prompt = new Confirm({
      name: 'certDialogue',
      message: 'Missing session key, create new?',
    });

    if (await prompt.run() !== false) {
      const data = crypto.randomBytes(4096);

      writeFile(SessionLocation, data, (err) => {
        if (err) throw err;
      });
    }
  } else {
    console.log('Found existing session key.');
  }
};

// check for missing or uninitialized config
const checkConfig = async () => {
  await config.read();

  if (config.data === null) {
    config.data = defaultConfig;
    await config.write();
  }
};

// check for missing or uninitialized salt
const checkTripSalt = async () => {
  if (existsSync(SaltLocation) === false) {
    const prompt = new Confirm({
      name: 'overwrite',
      message: 'Missing trip salt, create new?',
    });

    if (await prompt.run() !== false) {
      const data = crypto.randomBytes(4096);

      writeFileSync(SaltLocation, data);
    }
  } else {
    console.log('Found existing trip salt.');
  }
};

// verify config has an admin account
const checkPermissions = async () => {
  if (typeof config.data.adminTrip === 'undefined' || config.data.adminTrip === '') {
    const salt = readFileSync(SaltLocation);

    const prompt = new Password({
      name: 'adminPassword',
      message: 'What is your admin password?',
    });

    const password = await prompt.run();

    config.data.adminTrip = createHash('sha256').update(password + salt, 'utf8').digest('base64').substr(0, 6);

    await config.write();
  } else {
    console.log(`Found admin trip: ${config.data.adminTrip}`);
  }
};

// prompt user for a channel name
const getChannel = async () => {
  const chanPrompt = new Input({
    message: 'New channel name:',
  });

  const chan = await chanPrompt.run();

  return chan;
};

// prompt user to save standard channels or input their own
const setupChannels = async () => {
  const standardMode = 'Use standard channels';
  const manualMode = 'Manual input';
  const modePrompt = new Select({
    name: 'mode',
    message: 'How would you like to setup the public channels?',
    choices: [
      standardMode,
      manualMode,
    ],
  });

  const mode = await modePrompt.run();

  if (mode === standardMode) {
    config.data.publicChannels = defaultChannels;

    await config.write();
  } else {
    const channels = [];
    let newChannel = '';

    for (;;) {
      console.log('(Leave blank to finish) Channels:', channels.join(', '));
      newChannel = await getChannel();

      if (newChannel === '') {
        break;
      } else {
        channels.push(newChannel);
      }
    }

    config.data.publicChannels = channels;

    await config.write();
  }
};

// check if pulic channels have been initialized
const checkPublicChannels = async () => {
  if (typeof config.data.publicChannels === 'undefined' || config.data.publicChannels.length === 0) {
    const prompt = new Confirm({
      name: 'addChannels',
      message: 'Missing public channels, setup now?',
    });

    if (await prompt.run() !== false) {
      await setupChannels();
    }
  } else {
    console.log('Found existing public channels.');
  }
};

// start checking
await checkCert();
await checkConfig();
await checkTripSalt();
await checkPermissions();
await checkPublicChannels();

// done!
console.log('Config completed!');
