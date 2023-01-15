import mongoose from 'mongoose';

const {Schema} = mongoose;

const schema = new Schema({
    channel_id: String,
    game: String,
    bits: Number,
    sender: String,
    action: String,
    config: Schema.Types.Mixed
}, {timestamps: true})

export default mongoose.model('Action', schema)
