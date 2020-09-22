/* Base error ranges */
const GlobalErrors = 10;
const JoinErrors = 20;
const ChannelErrors = 30;
const InviteErrors = 40;

/**
  * Holds the numeric id values for each error type
  * @typedef {object} Errors
  */
exports.Errors = {
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
  },

  Invite: {
    RATELIMIT: InviteErrors + 1,
    INVALID_LENGTH: InviteErrors + 2,
  },
};
