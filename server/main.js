/**
  * HackChat main server entry point
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

'use strict';

// import required classes
const Managers = require('./src/managers');
const wsServer = require('./src/core/server');

// initialize core reference
const core = {};

// load and initialize main manager classes
core.managers = {};
core.managers.dynamicImports = global.dynamicImports = new Managers.ImportsManager(core, __dirname);
core.managers.dynamicImports.init();

const configManager = core.managers.config = new Managers.Config(core, __dirname, core.managers.dynamicImports);
core.config = configManager.loadSync();

const commands = core.commands = new Managers.CommandManager(core);
commands.loadCommands();

const stats = core.managers.stats = new Managers.Stats(core);
stats.set('start-time', process.hrtime());

// initialize and start the server
const server = new wsServer(core);
