import mongoose from 'mongoose';
const { Schema } = mongoose;
import db from '../db'

const schema = new Schema({
    channel_id: String,
    game: String,
    bits: Number,
    sender: String,
    action: String,
    config: Schema.Types.Mixed
}, { timestamps: true })

export default db.model('Action', schema)
