import mongoose from 'mongoose';
const { Schema } = mongoose;
import db from '../db'

const schema = new Schema({
    game: String,
    name: String,
    dev: Boolean,
    data: Schema.Types.Mixed
})

export default db.model('Game', schema)
