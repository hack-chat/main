/*
  Description: Clears and resets the command modules, outputting any errors
*/

exports.run = async (core, server, socket, data) => {
  // increase rate limit chance and ignore if not admin
  if (socket.uType != 'admin') {
    server._police.frisk(socket.remoteAddress, 20);

    return;
  }

  // do command reloads and store results
  let loadResult = core.managers.dynamicImports.reloadDirCache('src/commands');
  loadResult += core.commands.loadCommands();

  // build reply based on reload results
  if (loadResult == '') {
    loadResult = `Loaded ${core.commands._commands.length} commands, 0 errors`;
  } else {
    loadResult = `Loaded ${core.commands._commands.length} commands, error(s): ${loadResult}`;
  }

  // reply with results
  server.reply({
    cmd: 'info',
    text: loadResult
  }, socket);

  // notify mods of reload #transparency
  server.broadcast({
    cmd: 'info',
    text: loadResult
  }, { uType: 'mod' });
};

exports.info = {
  name: 'reload',
  description: '(Re)loads any new commands into memory, outputs errors if any'
};
