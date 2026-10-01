/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Allow a siw
  * @version 1.0.0
  * @description Initiates a Sign-In-With-Solana request
  * @module siw
  */

import crypto from 'crypto';
import { Errors } from '../utility/_Constants.js';

// regex for base58 solana addresses
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const isValidSolanaAddress = (address) => solanaAddressRegex.test(address);

/**
  * Builds the siw string to pass to the wallet
  * @param {string} locale - User locale (e.g. 'en')
  * @param {string} domain - Domain to include in the siw
  * @param {string} address - Wallet address to include in the siw
  * @param {string} nonce - Single use code
  * @param {Date} expires - When to invalidate the siw
  * @public
  * @return {string}
  */
const getMessage = (locale, domain, address, nonce, expires) => {
  const now = new Date();
  let header = `${domain} wants you to sign in with your Solana account:`;
  let body = 'This action will authenticate your session and grant you access to restricted features.';

  // construct standard siw footer
  const footer = `Version: 1\nChain ID: solana:mainnet\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expires.toISOString()}`;

  // apply translations based on locale
  switch (locale) {
    case 'ar':
      header = `يريد ${domain} منك تسجيل الدخول باستخدام حساب Solana الخاص بك:`;
      body = 'سيؤدي هذا الإجراء إلى مصادقة جلستك ومنحك حق الوصول إلى الميزات المقيدة.';
      break;
    case 'bn':
      header = `${domain} চায় আপনি আপনার Solana অ্যাকাউন্ট দিয়ে সাইন ইন করুন:`;
      body = 'এই অ্যাকশনটি আপনার সেশন যাচাই করবে এবং আপনাকে সীমাবদ্ধ বৈশিষ্ট্যগুলিতে অ্যাক্সেস দেবে।';
      break;
    case 'cn':
      header = `${domain} 希望您使用 Solana 帳戶登入：`;
      body = '此操作將驗證您的工作階段並授予您存取受限功能的權限。';
      break;
    case 'de':
      header = `${domain} möchte, dass Sie sich mit Ihrem Solana-Konto anmelden:`;
      body = 'Diese Aktion authentifiziert Ihre Sitzung und gewährt Ihnen Zugriff auf eingeschränkte Funktionen.';
      break;
    case 'el':
      header = `Ο τομέας ${domain} θέλει να συνδεθείτε με τον λογαριασμό σας Solana:`;
      body = 'Αυτή η ενέργεια θα ελέγξει την ταυτότητα της συνεδρίας σας και θα σας παραχωρήσει πρόσβαση σε περιορισμένες λειτουργίες.';
      break;
    case 'es':
      header = `${domain} quiere que inicies sesión con tu cuenta de Solana:`;
      body = 'Esta acción autenticará tu sesión y te otorgará acceso a funciones restringidas.';
      break;
    case 'fa':
      header = `${domain} از شما می‌خواهد با حساب Solana خود وارد شوید:`;
      body = 'این اقدام جلسه شما را احراز هویت می‌کند و به شما اجازه دسترسی به ویژگی‌های محدود شده را می‌دهد.';
      break;
    case 'fi':
      header = `${domain} haluaa sinun kirjautuvan sisään Solana-tililläsi:`;
      body = 'Tämä toiminto todentaa istuntosi ja antaa sinulle pääsyn rajoitettuihin ominaisuuksiin.';
      break;
    case 'fr':
      header = `${domain} souhaite que vous vous connectiez avec votre compte Solana :`;
      body = 'Cette action authentifiera votre session et vous accordera l\'accès à des fonctionnalités restreintes.';
      break;
    case 'hi':
      header = `${domain} चाहता है कि आप अपने Solana खाते से साइन इन करें:`;
      body = 'यह कार्रवाई आपके सत्र को प्रमाणित करेगी और आपको प्रतिबंधित सुविधाओं तक पहुंच प्रदान करेगी।';
      break;
    case 'id':
      header = `${domain} ingin Anda masuk dengan akun Solana Anda:`;
      body = 'Tindakan ini akan mengautentikasi sesi Anda dan memberi Anda akses ke fitur yang dibatasi.';
      break;
    case 'it':
      header = `${domain} vuole che tu acceda con il tuo account Solana:`;
      body = 'Questa azione autenticherà la tua sessione e ti garantirà l\'accesso a funzionalità riservate.';
      break;
    case 'ja':
      header = `${domain} が Solana アカウントでのログインを求めています:`;
      body = 'この操作によりセッションが認証され、制限された機能へのアクセスが許可されます。';
      break;
    case 'lv':
      header = `${domain} W4N75 Y0U 70 51GN 1N W17H Y0UR 50L4N4 4CC0UN7:`;
      body = '7H15 4C710N W1LL 4U7H3N71C473 Y0UR 535510N 4ND GR4N7 Y0U 4CC355 70 R357R1C73D F347UR35.';
      break;
    case 'pt':
      header = `${domain} deseja que você faça login com sua conta Solana:`;
      body = 'Esta ação autenticará sua sessão e concederá acesso a recursos restritos.';
      break;
    case 'ru':
      header = `${domain} хочет, чтобы вы вошли в систему с помощью своей учетной записи Solana:`;
      body = 'Это действие аутентифицирует вашу сессию и предоставит вам доступ к ограниченным функциям.';
      break;
    case 'tr':
      header = `${domain}, Solana hesabınızla oturum açmanızı istiyor:`;
      body = 'Bu işlem oturumunuzun kimliğini doğrulayacak ve kısıtlanmış özelliklere erişmenizi sağlayacaktır.';
      break;
    case 'zh':
      header = `${domain} 希望您使用 Solana 帐户登录：`;
      body = '此操作将验证您的会话并授予您访问受限功能的权限。';
      break;
    default:
      break;
  }

  return `${header}\n${address}\n\n${body}\n\n${footer}`;
};

/**
  * Executes when invoked by a remote client
  * @param {Object} env - Environment object with references to core, server, socket & payload
  * @public
  * @return {void}
  */
export async function run({ server, socket, payload }) {
  const targetChannel = payload.channel || (socket.channels && socket.channels[0]);

  // ensure the socket is actively in a channel
  if (!targetChannel || !socket.channels || !socket.channels.includes(targetChannel)) {
    return server.reply({
      cmd: 'warn',
      text: 'You must be in a channel to connect a wallet.',
      id: Errors.Global.PERMISSION,
      channel: false,
    }, socket);
  }

  // enforce rate limits
  if (server.police.frisk(socket, 2)) {
    return server.reply({
      cmd: 'warn',
      text: 'Issuing commands too quickly. Wait a moment before trying again',
      id: Errors.Global.RATELIMIT,
      channel: targetChannel,
    }, socket);
  }

  // validate payload parameters
  if (typeof payload.address !== 'string' || !isValidSolanaAddress(payload.address)) {
    return false;
  }

  if (typeof payload.wallet !== 'string' || payload.wallet.length > 64) {
    return false;
  }

  if (typeof payload.locale !== 'string' || payload.locale.length > 4) {
    return false;
  }

  if (typeof payload.domain !== 'string' || payload.domain.length > 256) {
    return false;
  }

  // generate expiration and nonce buffers
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 5);

  const nonceBuffer = crypto.randomBytes(16);
  const nonce = nonceBuffer.toString('hex');

  const message = getMessage(
    payload.locale,
    payload.domain,
    payload.address,
    nonce,
    expires,
  );

  // attach pending siw properties to the socket session
  socket.siwMsg = message;
  socket.siwAddress = payload.address;
  socket.siwExpiry = expires;

  // dispatch signature request back to client
  return server.reply({
    cmd: 'signMessage',
    wallet: payload.wallet,
    message,
    channel: targetChannel,
  }, socket);
}

/**
  * The following payload properties are required to invoke this module:
  * "address", "domain", "locale", "wallet"
  * @public
  * @typedef {Array} siw/requiredData
  */
export const requiredData = ['address', 'domain', 'locale', 'wallet'];

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
    API: { cmd: 'siw', domain: '<return domain>', address: '<solana pubkey>', wallet: '<provider name>' }`,
};
