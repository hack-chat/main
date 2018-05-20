# Live Deployment Installation

If you're running your own instance of hack.chat, you can retain backwards-compatibility in order to ensure that software created for the main server will work on yours too.

1. [Clone](https://help.github.com/articles/cloning-a-repository/) the repository: `git clone https://github.com/hack-chat/main.git`
1. Change the directory: `cd main/server`
1. Install server dependencies: `npm install`
1. Configure the server: `npm run config` (you may also migrate a `config` directory into `./main/server` if you previously configured the server elsewhere)
1. Migrate the contents of `./main/client` into any suitable directory of your webserver
1. (OPTIONAL) Cleanup; you may delete `main/clientSource` and `main/documentation`

    You can now run start the server software with a process manager like [PM2](https://github.com/Unitech/pm2) (e.g., `pm2 start server/main.js --name HackChat`). If you plan on using SSL to serve the client; you will need to use a reverse proxy, as TLS is not natively supported by the hack.chat server software (this may change in future releases).

# Advanced

(TODO)
