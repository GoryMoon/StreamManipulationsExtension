import { Application } from 'express'
import rateLimit from 'express-rate-limit'
import { Server } from 'socket.io'
import v1 from './v1'
import v2 from './v2'
import dashboard from './dashboard'

export default function (app: Application, io: Server) {
    const apiLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 240, // 4 requests/sec
        standardHeaders: true,
    })

    /* V1 of the api */
    app.use('/v1', apiLimiter, v1(io))

    /* V2 of the api, functional changes compared to v1  */
    app.use('/v2', apiLimiter, v2(io))

    app.use('/dashboard', dashboard())
}
