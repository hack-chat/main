/*

*/

'use strict';

// you can require() modules here

// this function will only be only in the scope of the module
const createReply = (echoInput) => {
  if (echoInput.length > 100)
    echoInput = 'HOW ABOUT NO?';

  return `You want me to echo: ${echoInput}?`
};

// `exports.run()` is required and will always be passed (core, server, socket, data)
// be sure it's asyn too
// this is the main function
exports.run = async (core, server, socket, data) => {

  server.reply({
    cmd: 'info',
    text: `SHOWCASE MODULE: ${core.showcase} - ${this.createReply(data.echo)}`
  }, socket);

};

// `exports.init()` is optional, and will only be run when the module is loaded into memory
// it will always be passed a reference to the global core class
// note: this will fire again if a reload is issued, keep that in mind
exports.init = (core) => {
  if (typeof core.showcase === 'undefined') {
    core.showcase = 'init is a handy place to put global data by assigning it to `core`';
  }
}

// optional, if `data.echo` is missing `exports.run()` will never be called & the user will be alerted
// remember; this will only verify that the data is not undefined, not the type of data
exports.requiredData = ['echo'];

// optional parameters are marked, all others are required
exports.info = {
  name: 'showcase', // actual command name
  aliases: ['templateModule'], // optional, an array of other names this module can be executed by
  usage: 'showcase {echo}', // used for help output, can be ommited if no parameters are required
  description: 'Simple command module template & info' // used for help output
};
