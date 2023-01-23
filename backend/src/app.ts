import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import { engine } from 'express-handlebars'
import registerRoutes from './routes'
import helmet from 'helmet'
import compress from 'compression'
import { Server } from 'socket.io'

export default function (io: Server) {
    const app = express()

    if (app.get('env') === 'production') app.set('trust proxy', 1)

    app.use(logger('combined'))
    app.use(cors())
    app.use(helmet())
    app.use(compress())

    app.options('*', cors())
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.engine('handlebars', engine())
    app.set('view engine', 'handlebars')
    app.disable('etag')

    registerRoutes(app, io)
    app.use(express.static(path.join(__dirname, '../public')))

    return app
}
