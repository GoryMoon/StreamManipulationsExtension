import mongoose from 'mongoose'
let count = 0;

const connectWithRetry = () => {
    console.log('MongoDB connection with retry')
    mongoose.connect("mongodb://localhost:27017/stream_engineer", {autoIndex: true}).then(()=>{
        console.log('MongoDB is connected')
    }).catch(err => {
        console.log('MongoDB connection unsuccessful, retry after 5 seconds. ', ++count);
        setTimeout(connectWithRetry, 5000)
    })
}

connectWithRetry()

export default mongoose
