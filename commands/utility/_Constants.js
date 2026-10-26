/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary App settings
  * @version 1.0.1
  * @description Exports an object that hold common constants
  * @module Constants
  */

/**
  * Internal version, used mainly for debugging
  * @typedef {string} CodebaseVersion
  */
export const CodebaseVersion = '2.5.1';

/* Base error ranges */
const GlobalErrors = 10;
const CaptchaNotif = GlobalErrors + 10;
const JoinErrors = CaptchaNotif + 10;
const ChannelErrors = JoinErrors + 10;
const InviteErrors = ChannelErrors + 10;
const SaveConfigErrors = InviteErrors + 10;
const ClaimChannelErrors = SaveConfigErrors + 10;
const MakePrivateErrors = ClaimChannelErrors + 10;
const MakePublicErrors = MakePrivateErrors + 10;
const SetLevelErrors = MakePublicErrors + 10;
const SetMOTDErrors = SetLevelErrors + 10;
const ChangeColorErrors = SetMOTDErrors + 10;
const EmoteErrors = ChangeColorErrors + 10;
const WhisperErrors = EmoteErrors + 10;
const ForceColorErrors = WhisperErrors + 10;
const ForceFlairErrors = ForceColorErrors + 10;
const UsersErrors = ForceFlairErrors + 10;
const HackRequest = UsersErrors + 10;
const KickErrors = HackRequest + 10;
const LockRoomErrors = KickErrors + 10;
const WalletErrors = LockRoomErrors + 10;
const Password = WalletErrors + 10;

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
    NO_REJOIN: CaptchaNotif + 2,
    BAD_CAPTCHA: CaptchaNotif + 3,
  },

  Join: {
    INVALID_NICK: JoinErrors + 1,
    ALREADY_JOINED: JoinErrors + 2,
    NAME_TAKEN: JoinErrors + 3,
    CHANNEL_LOCKED: JoinErrors + 4,
    LEGACY_RESTRICT: JoinErrors + 5,
  },

  Channel: {
    INVALID_NAME: ChannelErrors + 1,
    INVALID_LENGTH: ChannelErrors + 2,
    DEY_BANNED: ChannelErrors + 3,
    CLOSE_WARNING: ChannelErrors + 4,
  },

  Invite: {
    RATELIMIT: InviteErrors + 1,
  },

  SaveConfig: {
    GENERAL_FAILURE: SaveConfigErrors + 1,
  },

  ClaimChannel: {
    MODS_CANT: ClaimChannelErrors + 1,
    ALREADY_OWNED: ClaimChannelErrors + 2,
    MUST_MINT: ClaimChannelErrors + 3,
    ACCEPT_CLAIM: ClaimChannelErrors + 4,
  },

  MakePrivate: {
    MISSING_PERMS: MakePrivateErrors + 1,
    ALREADY_PRIVATE: MakePrivateErrors + 2,
  },

  MakePublic: {
    MISSING_PERMS: MakePublicErrors + 1,
    ALREADY_PUBLIC: MakePublicErrors + 2,
  },

  SetLevel: {
    BAD_TRIP: SetLevelErrors + 1,
    BAD_LABEL: SetLevelErrors + 2,
    BAD_LEVEL: SetLevelErrors + 3,
    APPLY_ERROR: SetLevelErrors + 4,
    LEVEL_CONFLICT: SetLevelErrors + 5,
  },

  SetMOTD: {
    TOO_LONG: SetMOTDErrors + 1,
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

  ForceFlairErrors: {
    INVALID_FLAIR: ForceFlairErrors + 1,
    MISSING_NICK: ForceFlairErrors + 2,
  },

  Users: {
    BAD_HASH_OR_IP: UsersErrors + 1,
  },

  HackRequest: {
    BAD_PERMS: HackRequest + 1,
    RATELIMIT: HackRequest + 2,
    TOO_LONG: HackRequest + 3,
    BAD_URL: HackRequest + 4,
  },

  Kick: {
    MISSING_NICK: KickErrors + 1,
  },

  LockRoom: {
    LEVEL_TOO_HIGH: LockRoomErrors + 1,
    LEVEL_REQUIRED: LockRoomErrors + 2,
    ALREADY_LOCKED: LockRoomErrors + 3,
    NO_REJOIN: LockRoomErrors + 4,
    INVALID_PASSWORD: LockRoomErrors + 5,
    NOT_LOCKED: LockRoomErrors + 6,
    UNLOCK_REQ: LockRoomErrors + 7,
  },

  Wallet: {
    INVALID_AMOUNT: WalletErrors + 1,
    USER_NOT_READY: WalletErrors + 2,
    RPC_ERROR: WalletErrors + 3,
    CMD_HELP: WalletErrors + 4,
    NO_SELF: WalletErrors + 5,
    BAD_TX: WalletErrors + 6,
    YOUR_NOT_READY: WalletErrors + 7,
  },

  Password: {
    NO_AUTO_JOIN: Password + 1,
  },
};

/* Base Info Ranges */
const InfoStart = 1000; // start high to avoid collision
const AdminInfo = InfoStart + 100;
const ModInfo = AdminInfo + 100;
const CoreInfo = ModInfo + 100;
const CaptchaInfo = CoreInfo + 100;
const WalletInfo = CaptchaInfo + 100;
const ChannelInfo = WalletInfo + 100;

/**
  * Holds the numeric id values for each info type
  * @typedef {object} Info
  */
export const Info = {
  Admin: {
    YOU_ARE_MOD: AdminInfo + 1,
    MOD_ADDED: AdminInfo + 2,
    USER_LIST: AdminInfo + 3,
    RELOAD_STATUS: AdminInfo + 4,
    YOU_ARE_USER: AdminInfo + 5,
    MOD_REMOVED: AdminInfo + 6,
    CONFIG_SAVED: AdminInfo + 7,
  },

  Mod: {
    BANNED: ModInfo + 1,
    BANNED_DETAILED: ModInfo + 2,
    MUZZLED_DETAILED: ModInfo + 3,
    KICKED_DETAILED: ModInfo + 4,
    KICKED: ModInfo + 5,
    LOCKED_DETAILED: ModInfo + 6,
    UNMUZZLED_ALL: ModInfo + 7,
    UNMUZZLED_DETAILED: ModInfo + 8,
    UNBANNED_DETAILED: ModInfo + 9,
    UNBANNED_ALL_DETAILED: ModInfo + 10,
    UNLOCKED_DETAILED: ModInfo + 11,
    UWUIFY_ENABLED: ModInfo + 12,
    UWUIFY_DISABLED: ModInfo + 13,
    PASS_ENABLED: ModInfo + 14,
    PASS_DISABLED: ModInfo + 15,
  },

  Core: {
    NICK_CHANGED: CoreInfo + 1,
    MY_HASH: CoreInfo + 2,
    HELP_TEXT: CoreInfo + 3,
    MOTD: CoreInfo + 4,
    STATS_FULL: CoreInfo + 5,
    STATS_BASIC: CoreInfo + 6,
    PURGATORY_QUOTE: CoreInfo + 7,
    PURGATORY_NOTIFY: CoreInfo + 8,
    CHANNEL_LIST: CoreInfo + 9,
    NEW_PUBLIC: CoreInfo + 10,
  },

  Captcha: {
    NOT_ENABLED: CaptchaInfo + 1,
    DISABLED: CaptchaInfo + 2,
    ALREADY_ENABLED: CaptchaInfo + 3,
    ENABLED: CaptchaInfo + 4,
  },

  Wallet: {
    DISCONNECTED: WalletInfo + 1,
    ADDRESS_REQUESTED: WalletInfo + 2,
    TX_RELAYED: WalletInfo + 3,
    VIEWED: WalletInfo + 4,
    CONNECTED: WalletInfo + 5,
  },

  ChannelInfo: {
    NOW_OWNED: ChannelInfo + 1,
    PERMS_CHANGED: ChannelInfo + 2,
    MOTD_CHANGED: ChannelInfo + 3,
    OWNER_RESET: ChannelInfo + 4,
    NO_PASS: ChannelInfo + 5,
    REQUESTING_OWNERSHIP: ChannelInfo + 6,
    ACCEPT_CHANGES: ChannelInfo + 7,
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
  'Enjoying hack.chat? Support us: https://patreon.com/marzavec',
  'We have a Twitter for some reason: https://x.com/HackDotChat',
  'Protip: You can claim an unclaimed channel by using /mintchannel',
  'Protip: You can send emotes like: /me does a thing',
  'Protip: The owner of a channel can create moderators: /setlevel <trip> channelModerator',
  'Protip: A moderator can kick people from the room: /kick <name>',
  'Protip: Use /getchannels anytime to see a list of public channels',
  'Protip: You can do ==/help== or ==/help command==',
  'Protip: Privately message with: /whisper @name The message',
  'Protip: A moderator can lock a channel with: /lockroom',
  'Miss the old hack.chat? Try: [legacy.hack.chat](https://legacy.hack.chat/)',
  'Want a neat effect on your name? Checkout: /donate',
  'Protip: Need to change your trip? Type: /logout',
  'Protip: Too many messages? Type: /clear',
  'Welcome to hack.chat v2, feel free to report issues to https://github.com/hack-chat/main/issues',
  'You got hack.chat v2 before GTA 6',
];

/**
  * Maximum length of a channels MOTD string
  * @typedef {object} MaxMOTDLength
  */
export const MaxMOTDLength = 500;

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

/**
  * Object defining labels for default permission ranges
  * @typedef {Object} levels
  * @property {number} admin Global administrator range
  * @property {number} moderator Global moderator range
  * @property {number} channelOwner Local administrator range
  * @property {number} channelModerator Local moderator range
  * @property {number} channelTrusted Local (non-public) channel trusted
  * @property {number} trustedUser Public channel trusted
  * @property {number} default Default user level
  */
export const levels = {
  admin: 9999999,
  moderator: 999999,

  channelOwner: 99999,
  channelModerator: 9999,
  channelTrusted: 8999,

  trustedUser: 500,
  default: 100,
  bot: 99,
};

/**
  * Object defining visual appearance (color/flair) for permission ranges
  * @typedef {Object} levelAppearance
  * @property {number} admin Global administrator range
  */
export const levelAppearance = {
  [levels.admin]: {
    color: 'd73737',
    flair: String.fromCodePoint(127775), // 🌟
  },
  [levels.moderator]: {
    color: '1fad83',
    flair: String.fromCodePoint(11088), // ⭐
  },
  [levels.channelOwner]: {
    color: 'dd8800',
    flair: String.fromCodePoint(128081), // 👑
  },
  [levels.channelModerator]: {
    color: '2fa1ee',
    flair: String.fromCodePoint(128171), // 💫
  },
  [levels.bot]: {
    color: '2fa1ee',
    flair: String.fromCodePoint(129302), // 🤖
  },
};

export default Errors;
