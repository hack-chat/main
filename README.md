# hack.chat

[hack.chat](https://hack.chat/) is a minimal, distraction-free, accountless, logless, disappearing chat service which is easily deployable as your own service. The current client comes bundled with LaTeX rendering provided by [KaTeX](https://github.com/Khan/KaTeX) and code syntax highlighting provided by [highlight.js](https://github.com/isagalaev/highlight.js).

A list of software developed for the hack.chat framework can be found at the [3rd party software list](https://github.com/hack-chat/3rd-party-software-list) repository. This includes bots, clients, docker containers, etc.

This is a backwards compatible continuation of the [work by Andrew Belt](https://github.com/AndrewBelt/hack.chat). The server code has been updated to ES6 along with several new features including new commands and hot-reload of the commands/protocol. There is also [documentation](documentation/DOCUMENTATION.md) and a [changelog](CHANGELOG.md).

# Installation

## Prerequisites

- [node.js 8.10.0](https://nodejs.org/en/download/package-manager/#windows) or higher
- [npm 5.7.1](https://nodejs.org/en/download/package-manager/#windows) or higher

## Developer Installation

1. [Clone](https://help.github.com/articles/cloning-a-repository/) the repository: `git clone https://github.com/hack-chat/main.git`
1. Change the directory: `cd main`
1. Install the dependencies: `npm install`
1. Launch: `npm start`

    If you change the `websocketPort` option during the config setup then these changes will need to be reflected on [line 60 of client.js](https://github.com/hack-chat/main/blob/master/client/client.js#L60).

## Live Deployment Installation

See [DEPLOY.md](documentation/DEPLOY.md)

# Contributing

- If you are modifying commands, make sure it is backwards compatible with the legacy client and you update the documentation accordingly.
- Use [the template](documentation/templateCommand.js) to learn how to create new commands.
- Use two space indents.
- Name files in camelCase.
- Scripts that do not default to strict mode (such as modules) must use the `'use strict'` directive.

# Credits

* [**Marzavec**](https://github.com/marzavec) - *Initial work*
* [**MinusGix**](https://github.com/MinusGix) - *Base updates*
* [**Neel Kamath**](https://github.com/neelkamath) - *Base Documentation*
* [**Carlos Villavicencio**](https://github.com/po5i) - *Syntax Highlighting Integration*
* Andrew Belt, https://github.com/AndrewBelt, for original base work
* [wwandrew](https://github.com/wwandrew), for finding server flaws (including attack vectors) and submitting ~~___incredibly detailed___~~ bug reports
* [Everyone else](https://github.com/hack-chat/main/graphs/contributors) who participated in this project.

# License

This project is licensed under the [WTFPL License](LICENSE).
