import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import { engine } from 'express-handlebars'
import helmet from 'helmet'
import compress from 'compression'

import registerRoutes from './routes'
import logger from './logger'
import type { IoServer } from './types'

export default function (io: IoServer) {
    const app = express()

    if (app.get('env') === 'production') app.set('trust proxy', 1)

    app.use(
        morgan(':remote-addr :remote-user ":method :url" :status :res[content-length] ":user-agent"', {
            stream: {
                write: function (message: string) {
                    logger.info(message.trim())
                },
            },
        }),
    )
    app.use(cors())
    app.use(helmet())
    app.use(compress())

    app.options('*', cors())
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.engine('handlebars', engine())
    app.set('view engine', 'handlebars')
    app.set('views', './views')
    app.disable('x-powered-by')
    app.disable('etag')

    registerRoutes(app, io)

    return app
}
