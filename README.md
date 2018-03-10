# Hack.Chat v2

This is a backwards compatible continuation of the work by Andrew Belt [https://github.com/AndrewBelt/hack.chat](https://github.com/AndrewBelt/hack.chat). The server code has been updated to ES6 along with several new features- including new commands and hot-reload of the commands/protocol.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them

```
    node >= 8.10.0
    npm >= 5.7.1
```

### Installing

Clone this git and cd into the directory. These steps will get a development env running:

```
npm install
```

Or on a Windows machine with Yarn installed:

```
yarn install
```

Then:

```
node main.js
```

The configuration script will execute the initial server setup by requesting input. Follow the steps until it finishes:

```
Note: npm/yarn run config will re-run this utility.

You will now be asked for the following:
-     Admin Name, the initial admin username
-     Admin Pass, the initial admin password
-           Port, the port for the websocket
-           Salt, the salt for username trip
​
prompt: adminName:  admin
prompt: adminPass:  ****

prompt: websocketPort:  (6060)
prompt: tripSalt:  ************

Config generated! You may now start the server normally.
```

You may now begin development or deploy to live system with a node process manager.

## Deployment

After configuration, push everything except the node_modules folder to the live server and re-run:

```
npm install
```

You can now run start the server software with a process manager like PM2.

## Authors

* **Marzavec** - *Initial work* - [https://github.com/marzavec](https://github.com/marzavec)

See also the list of [contributors](https://github.com/hack-chat/main.git/contributors) who participated in this project.

## License

This project is licensed under the WTFPL License - see the [http://www.wtfpl.net/txt/copying/](http://www.wtfpl.net/txt/copying/) file for details

## Acknowledgments

* TODO
