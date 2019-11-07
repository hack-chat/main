/**
  * Server configuration script, to (re)configure server options
  * @author Marzavec ( https://github.com/marzavec )
  * @version v2.0.0
  * @license WTFPL ( http://www.wtfpl.net/txt/copying/ )
  */

// import required classes
import { join } from 'path';
import ConfigManager from '../serverLib/ConfigManager';
import SetupWizard from './configLib/SetupWizard';

// import and initialize configManager & dependencies
const serverConfig = new ConfigManager(join(__dirname, '../..'));
const setup = new SetupWizard(serverConfig);

setup.start();
