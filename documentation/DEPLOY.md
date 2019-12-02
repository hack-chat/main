# Development Enviroment

1. [Clone](https://help.github.com/articles/cloning-a-repository/) the repository.
    * Terminal Command: `git clone https://github.com/hack-chat/main.git hackchat`
1. Enter the directory in your terminal.
    * Terminal Command: `cd hackchat`
1. Install using npm. 
    * Terminal Command: `npm install`
1. Start the application. 
    * Terminal Command: `npm start`

# Live Deployment Installation

1. (Follow steps 1 - 3 above)
1. Use PM2 to start the backend server.
    * Terminal Command: `pm2 start ./server/main.js --node-args="-r esm" --name hackchat`
    * See tips below to make the server start on boot.
1. Migrate the contents of `./hackchat/client` into any suitable directory of your webserver. HackChat comes bundled with `http-server` for development purposes only, it is highly recommended that you use a better web server such as Nginx or Apache.
1. (OPTIONAL) Cleanup; you may delete `hackchat/clientSource` and `hackchat/documentation`

# Tips

* If you plan on using SSL to serve the client; you will need to use a **reverse proxy**, as TLS is not natively supported by the hack.chat server software (this may change in future releases).
* **Do not use root.** Installing while using the root account or installing with root privileges will result in an error similar to the following:
`npm WARN lifecycle hack.chat-v2@2.1.92~postinstall: cannot run in wd hack.chat-v2@2.1.91 cd ./clientSource && npm install && cd .. & cd ./server && npm install && npm run config (wd='/dir')`
* PM2 may be configured to start the backend server on boot, read [https://pm2.keymetrics.io/docs/usage/startup/](https://pm2.keymetrics.io/docs/usage/startup/)
* **Do not install NodeJS using** `sudo apt install nodejs`, instead use:
   ```bash
   cd ~
   curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
   sudo bash nodesource_setup.sh
   sudo apt install nodejs
   ```
* Quick setup script, tested on Ubuntu 18. 
  * `cd ~`
  * `nano ./hc_install.sh`
  * Paste:
    ```bash
    #!/bin/bash
    cd ~
    sudo apt update
    sudo apt install build-essential git
    curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
    sudo bash nodesource_setup.sh
    sudo apt install nodejs
    nodejs -v
    npm -v
    git --version
    git clone https://github.com/hack-chat/main.git hackchat
    cd hackchat
    npm install
    ```
  * `Ctrl + x`
  * `Y`
  * `chmod u+x ./hc_install.sh`
  * `./hc_install.sh`