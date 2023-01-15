import mongoose from 'mongoose';

const {Schema} = mongoose;

const schema = new Schema({
    channel_id: String,
    game: String,
    config: Schema.Types.Mixed
})

export default mongoose.model('Config', schema)
