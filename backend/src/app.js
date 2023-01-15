import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import {engine} from 'express-handlebars';
import indexRouter from './routes/index';
import helmet from 'helmet';
import compress from 'compression';

export default function (io) {
    const app = express()

    app.use(logger('combined'))
    app.use(cors())
    app.use(helmet())
    app.use(compress())

    app.options('*', cors())
    app.use(express.json())
    app.use(express.urlencoded({extended: false}))
    app.use(cookieParser())
    app.engine('handlebars', engine())
    app.set('view engine', 'handlebars')
    app.disable('etag')

    app.use('/', indexRouter(io));
    app.use(express.static(path.join(__dirname, '../public')))

    return app
}
