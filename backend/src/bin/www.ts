import dotenv from 'dotenv'

import {AddressInfo} from 'net'
import createApp from '../app'
import setupChats from '../chat'
import setupSocket from '../socket'
import setupDB from '../db'

async function start() {
    dotenv.config()

    await setupDB()
    await setupChats()
    const port = normalizePort(process.env.PORT || '3000')
    const io = setupSocket()
    const app = createApp(io)

    const httpServer = app.listen(port)
    io.listen(httpServer);
    httpServer.on('error', function (error: Error) {
        const bind = typeof port === 'string'
            ? 'Pipe ' + port
            : 'Port ' + port;

        // handle specific listen errors with friendly messages
        switch (error.name) {
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
    });
    httpServer.on('listening', function () {
        const address = httpServer.address();
        const bind = isAddress(address)
            ? 'port ' + address.port
            : 'pipe ' + address;
        console.log('[www] Listening on ' + bind);
    });
}

start().then()

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }

    if (port >= 0) {
        return port;
    }

    return false;
}

function isAddress(obj: any): obj is AddressInfo {
    return 'address' in obj;
}

