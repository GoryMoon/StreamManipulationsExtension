import mongoose from 'mongoose'
import {ServerApiVersion} from 'mongodb'

let count = 0;

const connectWithRetry = () => {
    console.log('[MongoDB] Trying to connect')
    mongoose.set('strictQuery', false)
    mongoose.connect(process.env.MONGO_URI, {
        autoIndex: true,
        serverApi: ServerApiVersion.v1,
    }).then(() => {
        console.log('[MongoDB] Connected')
    }).catch(err => {
        console.log('[MongoDB] Connection unsuccessful, retry after 5 seconds. ', ++count);
        setTimeout(connectWithRetry, 5000)
    })
}

export default connectWithRetry