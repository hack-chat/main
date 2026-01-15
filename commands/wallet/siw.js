/**
  * @author Marzavec
  * @summary Allow a siw
  * @version 1.0.0
  * @description Initiates a Sign-In-With-Solana request
  * @module siw
  */

import crypto from 'crypto';

const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const isValidSolanaAddress = (address) => solanaAddressRegex.test(address);

const getMessage = (locale, address, nonce, expires) => {
  const now = new Date();
  let header = 'hack.chat wants you to sign in with your Solana account:';
  let body = 'This action will authenticate your session and grant you access to restricted features.';
  const footer = `Version: 1
Chain ID: solana:mainnet
Nonce: ${nonce}
Issued At: ${now.toISOString()}
Expiration Time: ${expires.toISOString()}`;

  // @todo
  switch (locale) {
    case 'ar':
      header = '';
      body = '';
      break;
    case 'bn':
      header = '';
      body = '';
      break;
    case 'cn':
      header = '';
      body = '';
      break;
    case 'de':
      header = '';
      body = '';
      break;
    case 'el':
      header = '';
      body = '';
      break;
    case 'es':
      header = '';
      body = '';
      break;
    case 'fa':
      header = '';
      body = '';
      break;
    case 'fi':
      header = '';
      body = '';
      break;
    case 'fr':
      header = '';
      body = '';
      break;
    case 'hi':
      header = '';
      body = '';
      break;
    case 'id':
      header = '';
      body = '';
      break;
    case 'it':
      header = '';
      body = '';
      break;
    case 'ja':
      header = '';
      body = '';
      break;
    case 'pt':
      header = '';
      body = '';
      break;
    case 'ru':
      header = '';
      body = '';
      break;
    case 'tr':
      header = '';
      body = '';
      break;
    case 'zh':
      header = '';
      body = '';
      break;
    default:
      break;
  }

  return `${header}
${address}

${body}

${footer}`;
};

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Enviroment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({
  server, socket, payload,
}) {
  // must be in a channel to run this command
  if (typeof socket.channel === 'undefined') {
    return server.police.frisk(socket, 1);
  }

  if (typeof payload.address !== 'string') {
    return false;
  }

  if (!isValidSolanaAddress(payload.address)) {
    return false;
  }

  if (typeof payload.wallet !== 'string' || payload.wallet.length > 64) {
    return false;
  }

  /* if (typeof payload.locale !== 'string' || payload.locale.length > 4) {
    return false;
  } */

  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 5);
  const nonceBuffer = crypto.randomBytes(16);
  const nonce = nonceBuffer.toString('hex');

  const message = getMessage(
    /* payload.locale, */ 'en',
    payload.address,
    nonce,
    expires,
  );

  socket.siwMsg = message;
  socket.siwAddress = payload.address;
  socket.siwExpiry = expires;

  return server.reply({
    cmd: 'signMessage',
    wallet: payload.wallet,
    message,
  }, socket);
}

/**
  * The following payload properties are required to invoke this module:
  * "address", "locale", "wallet"
  * @public
  * @typedef {Array} siw/requiredData
  */
export const requiredData = ['address', /* 'locale', */ 'wallet'];

/**
  * Module meta information
  * @public
  * @typedef {Object} siw/info
  * @property {string} name - Module command name
  * @property {string} description - Information about module
  * @property {string} usage - Information about module usage
  */
export const info = {
  name: 'siw',
  category: 'wallet',
  description: 'Initiates a Solana wallet login request',
  usage: `
    API: { cmd: 'siw', address: '<solana pubkey>', wallet: '<provider name>' }`,
};
