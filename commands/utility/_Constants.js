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
export const CodebaseVersion = '2.2.24b';

/* Base error ranges */
const GlobalErrors = 10;
const CaptchaNotif = GlobalErrors + 10;
const JoinErrors = CaptchaNotif + 10;
const ChannelErrors = JoinErrors + 10;
const InviteErrors = ChannelErrors + 10;
const SessionErrors = InviteErrors + 10;
const SaveConfigErrors = SessionErrors + 10;
const ClaimChannelErrors = SaveConfigErrors + 10;
const MakePrivateErrors = ClaimChannelErrors + 10;
const MakePublicErrors = MakePrivateErrors + 10;
const RenewClaimErrors = MakePublicErrors + 10;
const SetLevelErrors = RenewClaimErrors + 10;
const SetMOTDErrors = SetLevelErrors + 10;
const UnclaimChannelErrors = SetMOTDErrors + 10;
const ChangeColorErrors = UnclaimChannelErrors + 10;
const EmoteErrors = ChangeColorErrors + 10;
const WhisperErrors = EmoteErrors + 10;
const ForceColorErrors = WhisperErrors + 10;
const UsersErrors = ForceColorErrors + 10;

/**
  * Holds the numeric id values for each error type
  * @typedef {object} Errors
  */
export const Errors = {
  Global: {
    RATELIMIT: GlobalErrors + 1,
    UNKNOWN_USER: GlobalErrors + 2,
    PERMISSION: GlobalErrors + 3,
    INTERNAL_ERROR: GlobalErrors + 4,
    MISSING_TRIPCODE: GlobalErrors + 5,
    UNKNOWN_CMD: GlobalErrors + 6,
  },

  Captcha: {
    MUST_SOLVE: CaptchaNotif + 1,
  },

  Join: {
    RATELIMIT: JoinErrors + 1,
    INVALID_NICK: JoinErrors + 2,
    ALREADY_JOINED: JoinErrors + 3,
    NAME_TAKEN: JoinErrors + 4,
    CHANNEL_LOCKED: JoinErrors + 5,
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

  SaveConfig: {
    GENERAL_FAILURE: SaveConfigErrors + 1,
  },

  ClaimChannel: {
    MODS_CANT: ClaimChannelErrors + 1,
    ALREADY_OWNED: ClaimChannelErrors + 2,
  },

  MakePrivate: {
    MISSING_PERMS: MakePrivateErrors + 1,
    ALREADY_PRIVATE: MakePrivateErrors + 2,
  },

  MakePublic: {
    MISSING_PERMS: MakePublicErrors + 1,
    ALREADY_PUBLIC: MakePublicErrors + 2,
  },

  RenewClaim: {
    MODS_CANT: RenewClaimErrors + 1,
    NOT_OWNER: RenewClaimErrors + 2,
    TOO_SOON: RenewClaimErrors + 3,
  },

  SetLevel: {
    BAD_TRIP: SetLevelErrors + 1,
    BAD_LABEL: SetLevelErrors + 2,
    BAD_LEVEL: SetLevelErrors + 3,
    APPLY_ERROR: SetLevelErrors + 4,
  },

  SetMOTD: {
    TOO_LONG: SetMOTDErrors + 1,
  },

  UnclaimChannel: {
    NOT_OWNED: UnclaimChannelErrors + 1,
    FAKE_OWNER: UnclaimChannelErrors + 2,
  },

  ChangeColor: {
    INVALID_COLOR: ChangeColorErrors + 1,
  },

  Emote: {
    MISSING_TEXT: EmoteErrors + 1,
  },

  Whisper: {
    MISSING_NICK: WhisperErrors + 1,
    NO_REPLY: WhisperErrors + 2,
  },

  ForceColor: {
    MISSING_NICK: ForceColorErrors + 1,
  },

  Users: {
    BAD_HASH_OR_IP: UsersErrors + 1,
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
  'Protip: Using any hex color code, you can change your name color- for example: /color #FFFFFF',
  'Protip: You can easily change your name with a command: /nick bob',
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

/**
  * Minutes between inactive channel checking
  * @typedef {number} ChannelCheckInterval
  */
export const ChannelCheckInterval = 1000 * 60 * 10; // 10 minutes

/**
  * How many minutes until a channel is considered inactive
  * @typedef {number} InactiveAfter
  */
export const InactiveAfter = 1000 * 60 * 60; // 1 hour

export default Errors;
