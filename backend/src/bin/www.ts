import dotenv from 'dotenv'
import createApp from '../app'
import setupChats from '../chat'
import setupSocket from '../socket'
import setupDB from '../db'
import { isAddress } from '../utils'

async function start() {
    dotenv.config()

    await setupDB()
    await setupChats()
    const port = normalizePort(process.env.PORT || '3000')
    const io = setupSocket()
    const app = createApp(io)

    const httpServer = app.listen(port)
    io.listen(httpServer)
    httpServer.on('error', function (error: Error) {
        const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

        // handle specific listen errors with friendly messages
        switch (error.name) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges')
                process.exit(1)
                break
            case 'EADDRINUSE':
                console.error(bind + ' is already in use')
                process.exit(1)
                break
            default:
                throw error
        }
    })
    httpServer.on('listening', function () {
        const address = httpServer.address()
        const bind = isAddress(address) ? `port ${address.port}` : `pipe ${String(address)}`
        console.log('[App] Listening on ' + bind)
    })
}

void start()

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
    const port = parseInt(val, 10)

    if (isNaN(port)) {
        return val
    }

    if (port >= 0) {
        return port
    }

    return 3000
}
