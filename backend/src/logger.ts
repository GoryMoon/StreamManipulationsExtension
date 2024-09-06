import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new DailyRotateFile({
            dirname: 'logs',
            filename: 'logs.log.%DATE%',
            createSymlink: true,
            maxSize: '20m',
            maxFiles: 10,
        }),
        new winston.transports.Console({
            format: winston.format.cli(),
        }),
    ],
    exceptionHandlers: [
        new DailyRotateFile({
            dirname: 'logs',
            filename: 'exceptions.log.%DATE%',
            maxSize: '20m',
            maxFiles: 10,
        }),
    ],
})
export default logger
