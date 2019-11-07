/*
  Description: Clears and resets the command modules, outputting any errors
*/

// module main
export async function run(core, server, socket, data) {
  // increase rate limit chance and ignore if not admin
  if (socket.uType !== 'admin') {
    return server.police.frisk(socket.address, 20);
  }

  // do command reload and store results
  let loadResult = core.dynamicImports.reloadDirCache();
  loadResult += core.commands.loadCommands();

  // clear and rebuild all module hooks
  server.loadHooks();

  // build reply based on reload results
  if (loadResult === '') {
    loadResult = `Reloaded ${core.commands.commands.length} commands, 0 errors`;
  } else {
    loadResult = `Reloaded ${core.commands.commands.length} commands, error(s):
      ${loadResult}`;
  }

  if (typeof data.reason !== 'undefined') {
    loadResult += `\nReason: ${data.reason}`;
  }

  // reply with results
  server.reply({
    cmd: 'info',
    text: loadResult,
  }, socket);

  // notify mods of reload #transparency
  server.broadcast({
    cmd: 'info',
    text: loadResult,
  }, { uType: 'mod' });

  return true;
}

export const info = {
  name: 'reload',
  description: '(Re)loads any new commands into memory, outputs errors if any',
  usage: `
    API: { cmd: 'reload', reason: '<optional reason append>' }`,
};
