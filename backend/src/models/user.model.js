import mongoose from 'mongoose';

const {Schema} = mongoose;

const schema = new Schema({
    channel_id: String,
    token: String,
    channel_name: String,
    dev: {type: Boolean, default: false},
    connect_bot: {type: Boolean, default: false},
    socket_id: {type: String, default: null}
})

export default mongoose.model('User', schema)
