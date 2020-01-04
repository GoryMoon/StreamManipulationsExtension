#!/usr/bin/env node

import 'dotenv/config'
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import expressStatusMonitor from 'express-status-monitor'
import auth from 'http-auth'

import app from '../app'
import '../chat'
import debugLib from 'debug'
import http from 'http'
import socket from '../socket'
const debug = debugLib('sebackend:server');

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
const io = socket(server);

const statusMonitor = expressStatusMonitor({
  title: 'Stream Engineer Status',
  path: '',
  websocket: io,
  healthChecks: [
      {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT,
          path: '/v2/token/'
      },
      {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT,
          path: '/v2/token/create'
      },
      {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT,
          path: '/v1/game/spaceengineers/'
      },
      {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT,
          path: '/v1/actions/spaceengieers/'
      },
      {
          protocol: 'http',
          host: 'localhost',
          port: process.env.PORT,
          path: '/v1/action/spaceengineers/'
      }
  ]
});
const basic = auth.basic({
  realm: 'Stream Engineer Monitor',
  file: __dirname + '/../../users.htpasswd'
})
app.use(statusMonitor.middleware)
app.get('/status', auth.connect(basic), statusMonitor.pageRoute)


/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
