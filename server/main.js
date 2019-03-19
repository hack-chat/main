/**
  * HackChat main server entry point
  *
  * Version: v2.0.0
  * Developer: Marzavec ( https://github.com/marzavec )
  * License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
  *
  */

'use strict';

// import and initialize the core application
const CoreApp = require('./src/serverLib/CoreApp');
const coreApp = new CoreApp();
coreApp.init();
