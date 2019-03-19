/**
  * Server configuration script, to (re)configure server options
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

'use strict';

// import required classes
const path = require('path');
const ConfigManager = require('../serverLib/ConfigManager');
const SetupWizard = require('./configLib/SetupWizard');

// import and initialize configManager & dependencies
const serverConfig = new ConfigManager(path.join(__dirname, '../..'));
const setup = new SetupWizard(serverConfig);

setup.start();
