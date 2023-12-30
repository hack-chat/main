/**
  * @author Marzavec ( https://github.com/marzavec )
  * @summary Error ID list
  * @version 1.0.0
  * @description Exports an object that hold common global error IDs
  * @module Constants
  */

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

export default Errors;
