/*
  Description: This is a template module that should not be user in a production
               enviroment
*/

// you can require() modules here

// this function will only be only in the scope of the module
// module support functions
const createReply = (echoInput) => {
  if (echoInput.length > 100)
    echoInput = 'HOW ABOUT NO?';

  return `You want me to echo: ${echoInput}?`
};

/*
  `exports.init()` is optional, and will only be run when the module is loaded into memory
  it will always be passed a reference to the global core class
  note: this will fire again if a reload is issued, keep that in mind
*/
exports.init = (core) => {
  if (typeof core.showcase === 'undefined') {
    core.showcase = 'init is a handy place to put global data by assigning it to `core`';
  }
}

/*
  `exports.run()` is required and will always be passed (core, server, socket, data)

  be sure it's async too
  this is the main function that will run when called
*/
// module main
exports.run = async (core, server, socket, data) => {

  server.reply({
    cmd: 'info',
    text: `SHOWCASE MODULE: ${core.showcase} - ${createReply(data.echo)}`
  }, socket);

};

/*
  `exports.initHooks` is optional, this will be called when the server is ready
  for modules to register their hooking functions

  Hook function may alter the data before it is sent to a module, or before it
  is sent to a client. If the function returns `false` then the data will be
  dropped without further processing
*/
// module hook functions
exports.initHooks = (server) => {
  /*
    First param is hook type. A hook may be registered as either `in` or `out`:
      `in`: a hook function registered as `in` will be called before the client
          request is passed to the module they are attempting to call. Note: socket
          in this context is the client that sent the data
      `out`: a hook function registerd as `out` will be called before the data is
          sent to any clients. Note: `socket` in this context is the socket that
          will be sent the data.

    Second param is the `cmd` type to target, any valid module may be targeted

    Third param is the hook function itself, see `exports.hookExample` for an example
  */
  server.registerHook('in', 'chat', this.hookExample);
};

/*
  This hook function example alters the payload before it gets to the `chat` module,
  changing the user's input from 'hookexample' to 'WORKING!'
*/
exports.hookExample = (core, server, socket, payload) => {
  // check if we need to alter the payload
  if (payload.text === 'hookexample') {
    payload.text = 'WORKING!';
  }

  // always return the payload, or false if processing should drop it
  return payload;
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
