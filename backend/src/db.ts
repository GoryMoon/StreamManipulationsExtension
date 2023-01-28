import mongoose from 'mongoose'
import { ServerApiVersion } from 'mongodb'
import timersPromises from 'timers/promises'

const connectWithRetry = async (count = 0) => {
    console.log('[MongoDB] Trying to connect')
    mongoose.set('strictQuery', false)
    try {
        await mongoose.connect(process.env.MONGO_URI as string, {
            autoIndex: true,
            serverApi: ServerApiVersion.v1,
        })
        console.log('[MongoDB] Connected')
    } catch (err) {
        console.log('[MongoDB] Connection unsuccessful, retry after 5 seconds. ', ++count)
        await timersPromises.setTimeout(5000)
        await connectWithRetry(count)
    }
}

export default connectWithRetry
