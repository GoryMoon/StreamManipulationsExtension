import mongoose from 'mongoose';

const {Schema} = mongoose;

const schema = new Schema({
    game: String,
    name: String,
    dev: Boolean,
    data: Schema.Types.Mixed
})

export default mongoose.model('Game', schema)
