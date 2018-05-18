# hack.chat

[hack.chat](https://hack.chat/) is a minimal, distraction-free, accountless, logless, disappearing chat service which is easily deployable as your own service. The client comes bundled with LaTeX rendering provided by [KaTeX](https://github.com/Khan/KaTeX).

A list of software developed for the hack.chat framework can be found at the [3rd party software list](https://github.com/hack-chat/3rd-party-software-list) repository. This includes bots, clients, docker containers, etc.

This is a backwards compatible continuation of the [work by Andrew Belt](https://github.com/AndrewBelt/hack.chat). The server code has been updated to ES6 along with several new features including new commands and hot-reload of the commands/protocol. There is also [documentation](DOCUMENTATION.md) and a [changelog](CHANGELOG.md).

# Installation

## Prerequisites

- [node.js 8.10.0](https://nodejs.org/en/download/package-manager/#windows) or higher

## Installing

1. [Clone](https://help.github.com/articles/cloning-a-repository/) the repository: `git clone https://github.com/hack-chat/main.git`
1. Change the directory: `cd main`
1. Install the dependencies using a package manager of your choice:
    - npm: `npm install`
    - yarn: `yarn install`
1. Configure: `node server/main.js`

    If you change the `websocketPort` option during the config setup then these changes will need to be reflected on [line 59 of client.js](https://github.com/hack-chat/main/blob/master/client/client.js#L59).

# Usage

1. `cd` into the repository: `cd main`
1. Start the server with a process manager. For example, with [PM2](https://github.com/Unitech/pm2): `pm2 start server/main.js --name HackChat` 
1. Launch: `client/index.html`
1. (OPTIONAL) If you want to deploy your hack.chat instance to a server, push everything except the `node_modules` directory and install the dependencies using a package manager of your choice: 
    - npm: `npm install`
    - yarn: `yarn install`
  
    You can now run start the server software with a process manager. The client code will need to be copied into your http server directory. If you plan on using SSL to serve the client; you will need to use a reverse proxy, as TLS is not natively supported by the hack.chat server software (this may change in future releases).

# Contributing

- If you are modifying commands, make sure it is backwards compatible with the legacy client and you update the documentation accordingly.
- Use [the template](templateCommand.js) to learn how to create new commands.
- Use two space indents.
- Name files in camelCase.
- Scripts that do not default to strict mode (such as modules) must use the `'use strict'` directive.

# Credits

* [**Marzavec**](https://github.com/marzavec) - *Initial work*
* [**MinusGix**](https://github.com/MinusGix) - *Base updates*
* Andrew Belt, https://github.com/AndrewBelt/hack.chat, for original base work
* [wwandrew](https://github.com/wwandrew/), for finding server flaws (including attack vectors) and submitting ~~___incredibly detailed___~~ bug reports
* [Everyone else](https://github.com/hack-chat/main/graphs/contributors) who participated in this project.

# License

This project is licensed under the [WTFPL License](LICENSE).
