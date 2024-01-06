/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary App settings
  * @version 1.0.0
  * @description Exports an object that hold common constants
  * @module Constants
  */

/**
  * Internal version, used mainly for debugging
  * @typedef {object} CodebaseVersion
  */
export const CodebaseVersion = '2.2.21b';

/* Base error ranges */
const GlobalErrors = 10;
const JoinErrors = 20;
const ChannelErrors = 30;
const InviteErrors = 40;
const SessionErrors = 50;

/**
  * Holds the numeric id values for each error type
  * @typedef {object} Errors
  */
export const Errors = {
  Global: {
    RATELIMIT: GlobalErrors + 1,
    UNKNOWN_USER: GlobalErrors + 2,
    PERMISSION: GlobalErrors + 3,
  },

  Join: {
    RATELIMIT: JoinErrors + 1,
    INVALID_NICK: JoinErrors + 2,
    ALREADY_JOINED: JoinErrors + 3,
    NAME_TAKEN: JoinErrors + 4,
  },

  Channel: {
    INVALID_NAME: ChannelErrors + 1,
    INVALID_LENGTH: ChannelErrors + 2,
    DEY_BANNED: ChannelErrors + 3,
  },

  Invite: {
    RATELIMIT: InviteErrors + 1,
  },

  Session: {
    BAD_SESSION: SessionErrors + 1,
  },
};

/**
  * The settings structure of a default, unowned channel
  * @typedef {object} DefaultChannelSettings
  */
export const DefaultChannelSettings = {
  owned: false,
  ownerTrip: '',
  lastAccessed: new Date(),
  claimExpires: new Date(),
  motd: '',
  lockLevel: 0,
  tripLevels: {},
};

/**
  * An array of strings that may be used if the channel motd is empty
  * @typedef {object} SystemMOTDs
  */
export const SystemMOTDs = [
  'Protip: Using any hex color code, you can change your name color- for example: /color #FFFFFF`',
  'Protip: You can easily change your name with a command: /nick bob`',
];

/**
  * Maximum length of a channels MOTD string
  * @typedef {object} MaxMOTDLength
  */
export const MaxMOTDLength = 250;

/**
  * Maximum number of specialized trip levels, per channel
  * @typedef {number} MaxChannelTrips
  */
export const MaxChannelTrips = 250;

/**
  * How many days until a claim will expire
  * @typedef {number} ClaimExpirationDays
  */
export const ClaimExpirationDays = 7;

export default Errors;
