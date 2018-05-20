/*
  Description: Clears and resets the command modules, outputting any errors
*/

const name = 'reload';

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

  var obj = {
    cmd: 'info',
    name,
    text: loadResult
  };

  server.reply(obj, socket);

  server.broadcast(obj, { uType: 'mod' });
};

exports.info = {
  name,
  description: '(Re)loads any new commands into memory, outputs errors if any'
};

