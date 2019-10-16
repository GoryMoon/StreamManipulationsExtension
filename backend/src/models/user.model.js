import { Schema } from "mongoose";
import db from '../db'

const schema = new Schema({
    channel_id: String,
    token: String,
    socket_id: { type: String, default: null }
})

export default db.model('User', schema)