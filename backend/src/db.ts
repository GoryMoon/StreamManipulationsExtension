import mongoose from 'mongoose'
import { ServerApiVersion } from 'mongodb'
import timersPromises from 'timers/promises'

import logger from './logger'

const connectWithRetry = async (count = 0) => {
    logger.info('[MongoDB] Trying to connect')

    mongoose.set('strictQuery', false)
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: true,
            serverApi: ServerApiVersion.v1,
        })
        logger.info('[MongoDB] Connected')
    } catch (err) {
        logger.error(err)
        logger.error('[MongoDB] Connection unsuccessful, retry after 5 seconds. ', ++count)
        await timersPromises.setTimeout(5000)
        await connectWithRetry(count)
    }
}

export default connectWithRetry
