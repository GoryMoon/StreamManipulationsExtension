import mongoose from 'mongoose';
const { Schema } = mongoose;
import db from '../db'

const schema = new Schema({
    channel_id: String,
    game: String,
    config: Schema.Types.Mixed
})

export default db.model('Config', schema)
