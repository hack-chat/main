/**
  * Server configuration script, used reconfiguring server options
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

'use strict';

// import required classes
const path = require('path');
const ImportsManager = require('../managers/imports-manager');
const ConfigManager = require('../managers/config');

// import and initialize configManager & dependencies
const importManager = new ImportsManager(null, path.join(__dirname, '../..'));
importManager.init();
const configManager = new ConfigManager(null, path.join(__dirname, '../..'), importManager);

// execute config load with `reconfiguring` flag set to true
configManager.load(true);
