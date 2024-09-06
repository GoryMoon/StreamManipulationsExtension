import { Schema, Types, model } from 'mongoose'

interface IUser {
    _id: Types.ObjectId
    channel_id: string
    token: string
    channel_name: string
    dev: boolean
    connect_bot: boolean
    socket_id?: string,
    connected_game?: string,
}

const schema = new Schema<IUser>({
    _id: Schema.Types.ObjectId,
    channel_id: String,
    token: String,
    channel_name: String,
    dev: { type: Boolean, default: false },
    connect_bot: { type: Boolean, default: false },
    socket_id: { type: String, default: null },
    connected_game: { type: String, default: null },
})

const user = model<IUser>('User', schema)
export { user as default }
export type { IUser }
