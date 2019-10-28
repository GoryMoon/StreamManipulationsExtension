import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from "cors";
import exphbs from "express-handlebars";
import indexRouter from './routes/index';
import helmet from "helmet";
import compress from "compression";

const app = express()

app.use(logger('dev'))
app.use(cors())
app.use(helmet())
app.disable("x-powered-by")
app.use(compress())

app.options('*', cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.engine('handlebars', exphbs())
app.set('view engine', 'handlebars')
app.use(express.static(path.join(__dirname, '../public')))

app.use('/', indexRouter);

export default app;
