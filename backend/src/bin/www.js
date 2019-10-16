#!/usr/bin/env node

import 'dotenv/config'
import 'core-js/stable';
import 'regenerator-runtime/runtime';

import app from '../app'
import debugLib from 'debug'
import http from 'http'
import https from 'https'
import path from 'path'
import fs from 'fs'
import socket from '../socket'
const debug = debugLib('sebackend:server');

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

if (process.env.NODE_ENV !== "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const serverPathRoot = path.resolve(__dirname, '..', '..', 'conf', 'server');
  var server = https.createServer({
    cert: fs.readFileSync(serverPathRoot + '.crt'),
    key: fs.readFileSync(serverPathRoot + '.key'),
  },app);
} else {
  var server = http.createServer(app);
}

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
socket(server);

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
