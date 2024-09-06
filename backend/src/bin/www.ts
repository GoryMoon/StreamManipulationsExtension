import { createServer } from 'http'

import createApp from '../app'
import setupChats from '../chat'
import setupSocket from '../socket'
import setupDB from '../db'
import { isAddress } from '../utils'
import logger from '../logger'

declare module 'bun' {
    interface Env {
        URL: string
        PORT: number | string
        APP_SECRET: string
        MONGO_URI: string
        TWITCH_EXTENSTION_SECRET: string
        TWITCH_CLIENT_ID: string
        TWITCH_CLIENT_SECRET: string
    }
}

async function start() {
    await setupDB()
    await setupChats()
    const port = process.env.PORT || 3000
    const io = setupSocket()
    const app = createApp(io)

    const httpServer = createServer(app)
    io.listen(httpServer)
    httpServer.on('error', function (error: Error) {
        const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

        // handle specific listen errors with friendly messages
        switch (error.name) {
            case 'EACCES':
                logger.error(bind + ' requires elevated privileges')
                process.exit(1)
                break
            case 'EADDRINUSE':
                logger.error(bind + ' is already in use')
                process.exit(1)
                break
            default:
                throw error
        }
    })
    httpServer.on('listening', function () {
        const address = httpServer.address()
        const bind = isAddress(address) ? `${address.address}${address.port}` : `pipe ${String(address)}`
        logger.info('[App] Listening on ' + bind)
    })

    httpServer.listen(port)
}

await start()
