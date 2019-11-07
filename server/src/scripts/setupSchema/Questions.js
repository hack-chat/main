/**
  * This object contains Prompt ( https://www.npmjs.com/package/prompt ) style
  * questions that the SetupWizard will require an answer to. Questions are asked
  * in the order they are specified here.
  *
  * The resulting config.json file will be used by the server, accessed by the
  * name specified. IE, a valid use is; config.adminName
  *
  */

const Questions = {
  properties: {
    tripSalt: {
      description: 'Salt (leave as default)',
      type: 'string',
      hidden: true,
      replace: '*',
      before: (value) => {
        salt = value;
        return value;
      },
    },

    adminName: {
      description: 'Admin Nickname',
      pattern: /^"?[a-zA-Z0-9_]+"?$/,
      type: 'string',
      message: 'Nicks can only contain letters, numbers and underscores',
      before: (value) => value.replace(/"/g, ''),
    },

    adminTrip: {
      type: 'string',
      hidden: true,
      replace: '*',
      description: 'Admin Password',
      message: 'You must enter or re-enter a password',
      before: (value) => {
        const crypto = require('crypto');
        const sha = crypto.createHash('sha256');
        sha.update(value + salt);
        return sha.digest('base64').substr(0, 6);
      },
    },

    websocketPort: {
      type: 'integer',
      message: 'The port may only be a number!',
      description: 'Websocket Port',
      default: '6060',
    },
  },
};

module.exports = Questions;
