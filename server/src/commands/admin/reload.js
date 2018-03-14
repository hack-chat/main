/*
  Description: Clears and resets the command modules, outputting any errors
*/

'use strict';

exports.run = async (core, server, socket, data) => {
  if (socket.uType != 'admin') {
    // ignore if not admin
    return;
  }

  let loadResult = core.managers.dynamicImports.reloadDirCache('src/commands');
  loadResult += core.commands.loadCommands();

  if (loadResult == '') {
    loadResult = `Loaded ${core.commands._commands.length} commands, 0 errors`;
  } else {
    loadResult = `Loaded ${core.commands._commands.length} commands, error(s): ${loadResult}`;
  }

  server.reply({
    cmd: 'info',
    text: loadResult
  }, socket);

  server.broadcast({
    cmd: 'info',
    text: loadResult
  }, { uType: 'mod' });
};

exports.info = {
  name: 'reload',
  description: '(Re)loads any new commands into memory, outputs errors if any'
};
