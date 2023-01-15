import mongoose from 'mongoose';

const {Schema} = mongoose;

const schema = new Schema({
    channel_id: String,
    game: String,
    metrics: {type: Map, of: Number},
})

export default mongoose.model('Stat', schema)
