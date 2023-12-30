module.exports = {
  apps : [{
    name: 'hackchat-websocket',
    script: './main.mjs',
    autorestart: true,
    max_memory_restart: '2G',
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'hackchat-httpd',
    script: './node_modules/http-server/bin/http-server',
    args: './client -p 3000 -o',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
