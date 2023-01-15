#!/usr/bin/env node

import dotenv from 'dotenv'
import 'core-js/stable';

import createApp from '../app'
import '../chat'
import setupSocket from '../socket'
import setupDB from '../db'

dotenv.config()

setupDB()
const port = normalizePort(process.env.PORT || '3000')
const io = setupSocket()
const app = createApp(io)

const httpServer = app.listen(port)
io.listen(httpServer);
httpServer.on('error', onError);
httpServer.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    const port = parseInt(val, 10);

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

    const bind = typeof port === 'string'
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
    const address = httpServer.address();
    const bind = typeof address === 'string'
        ? 'pipe ' + address
        : 'port ' + address.port;
    console.log('[WWW] Listening on ' + bind);
}
