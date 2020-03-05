export const levels = {
  admin            : 9999999,
  moderator        : 999999,

  channelOwner     : 99999,
  channelModerator : 9999,

  user             : 100,
};

export function isAdmin (level) {
  return level >= levels.admin;
}

export function isModerator (level) {
  return level >= levels.moderator;
}

export function isChannelOwner (level) {
  return level >= levels.channelOwner;
}

export function isChannelModerator (level) {
  return level >= levels.channelModerator;
}

export async function run (core, server, socket, data) {}

export const info = {
  name: 'uac_info',
  description: 'This module contains information about UAC levels, and minor utility functions.',
};