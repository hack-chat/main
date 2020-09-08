/*
  Description: This module adjusts outgoing data, making it compatible with legacy clients
  Dear god this module is horrifying
*/

// import * as UAC from '../utility/UAC/_info';

// module main
export async function run(core, server, socket, data) {
  return server.police.frisk(socket.address, 20);
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'join', this.joinCheck.bind(this), 10);
  server.registerHook('in', 'invite', this.inviteInCheck.bind(this), 10);
  server.registerHook('out', 'invite', this.inviteOutCheck.bind(this), 10);
  server.registerHook('in', 'ban', this.banCheck.bind(this), 10);
  server.registerHook('in', 'dumb', this.dumbCheck.bind(this), 10);
  server.registerHook('in', 'kick', this.kickCheck.bind(this), 10);
}

// hook incoming join events, if session was not invoked, default proto to 1
export function joinCheck(core, server, socket, payload) {
  if (typeof socket.hcProtocol === 'undefined') {
    socket.hcProtocol = 1;

    const nickArray = payload.nick.split('#', 2);
    payload.nick = nickArray[0].trim();
    if (nickArray[1] && typeof payload.pass === 'undefined') {
      payload.pass = nickArray[1];
    }

    // dunno how this happened on the legacy version
    if (typeof payload.password !== 'undefined') {
      payload.pass = payload.password;
    }

    if (typeof socket.userid === 'undefined') {
      socket.userid = Math.floor(Math.random() * 9999999999999);
    }
  }

  return payload;
}

// if legacy client sent an invite, downgrade request
export function inviteInCheck(core, server, socket, payload) {
  if (socket.hcProtocol === 1) {
    let targetClient = server.findSockets({ channel: socket.channel, nick: data.nick });

    if (targetClient.length === 0) {
      server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
      }, socket);
  
      return false;
    }
  
    [targetClient] = targetClient;
  
    payload.userid = targetClient.userid;
    payload.channel = socket.channel;
  }
  
  return payload;
}

// 
export function inviteOutCheck(core, server, socket, payload) {
  if (socket.hcProtocol === 1) {
    payload.cmd = 'info';
    if (socket.userid === payload.from) {
      let toClient = server.findSockets({ channel: socket.channel, userid: payload.from });
      [toClient] = toClient;
      payload.type = 'invite';
      payload.from = toClient.nick;
      payload.text = `You invited ${toClient.nick} to ?${payload.inviteChannel}`;
    } else if (socket.userid === payload.to) {
      let fromClient = server.findSockets({ channel: socket.channel, userid: payload.from });
      [fromClient] = fromClient;
      payload.type = 'invite';
      payload.from = fromClient.nick;
      payload.text = `${fromClient.nick} invited you to ?${payload.inviteChannel}`;
    }
  }

  return payload;
}

export function banCheck(core, server, socket, payload) {
  if (socket.hcProtocol === 1) {
    let targetClient = server.findSockets({ channel: socket.channel, nick: data.nick });

    if (targetClient.length === 0) {
      server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
      }, socket);
  
      return false;
    }
  
    [targetClient] = targetClient;
  
    payload.userid = targetClient.userid;
    payload.channel = socket.channel;
  }
  
  return payload;
}

export function dumbCheck(core, server, socket, payload) {
  if (socket.hcProtocol === 1) {
    let targetClient = server.findSockets({ channel: socket.channel, nick: data.nick });

    if (targetClient.length === 0) {
      server.reply({
        cmd: 'warn',
        text: 'Could not find user in that channel',
      }, socket);
  
      return false;
    }
  
    [targetClient] = targetClient;
  
    payload.userid = targetClient.userid;
    payload.channel = socket.channel;
  }
  
  return payload;
}

export function kickCheck(core, server, socket, payload) {
  if (socket.hcProtocol === 1) {
    if (typeof payload.nick !== 'number') {
      if (typeof payload.nick !== 'object' && !Array.isArray(data.nick)) {
        return true;
      }
    }

    let targetClient = server.findSockets({ channel: socket.channel, nick: data.nick });

    if (targetClient.length === 0) {
      return false;
    }

    payload.userid = [];
    for (let i = 0, j = targetClient.length; i < j; i += 1) {
      payload.userid.push(targetClient[i].userid);
    }
    
    payload.channel = socket.channel;
  }
  
  return payload;
}

export const info = {
  name: 'legacylayer',
  description: 'This module adjusts outgoing data, making it compatible with legacy clients',
};
