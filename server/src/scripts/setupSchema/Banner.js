/**
  * This script will be run before the package starts asking for the config data,
  * used to output a simple guide for the coming questions, or to spam some sexy
  * ascii art at the user.
  *
  */

import { stripIndents } from 'common-tags';
import chalk from 'chalk';

// gotta have that sexy console
console.log(stripIndents`
  ${chalk.magenta('°º¤ø,¸¸,ø¤º°`°º¤ø,¸,ø¤°º¤ø,¸¸,ø¤º°`°º¤ø,¸°º¤ø,¸¸,ø¤º°`°º¤ø')}
  ${chalk.gray('--------------(') + chalk.white(' HackChat Setup Wizard v2.0 ') + chalk.gray(')--------------')}
  ${chalk.magenta('°º¤ø,¸¸,ø¤º°`°º¤ø,¸,ø¤°º¤ø,¸¸,ø¤º°`°º¤ø,¸°º¤ø,¸¸,ø¤º°`°º¤ø')}

  For advanced setup, see the documentation at:
  ${chalk.green('https://github.com/hack-chat/main/tree/master/documentation')}

  ${chalk.white('Note:')} ${chalk.green('npm/yarn run config')} will re-run this utility.

  You will now be asked for the following:
  -  ${chalk.magenta('      Salt')}, the salt for username trip
  -  ${chalk.magenta('Admin Name')}, the initial admin username
  -  ${chalk.magenta('Admin Pass')}, the initial admin password
  -  ${chalk.magenta('      Port')}, the port for the websocket
  \u200b
`);
