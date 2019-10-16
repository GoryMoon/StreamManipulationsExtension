import { Schema } from "mongoose";
import db from '../db'

const schema = new Schema({
    channel_id: String,
    game: String,
    metrics: { type: Map, of: Number },
})

export default db.model('Stat', schema)