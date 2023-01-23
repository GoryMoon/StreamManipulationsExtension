import { Schema, Types, Model, model } from 'mongoose'

interface IAction {
    _id: Types.ObjectId
    channel_id: string
    game: string
    bits: number
    sender: string
    action: string
    config: Partial<unknown>
}

const schema = new Schema<IAction, Model<IAction>>(
    {
        _id: Schema.Types.ObjectId,
        channel_id: { type: String, required: true },
        game: { type: String, required: true },
        bits: { type: Number, required: true },
        sender: { type: String, required: true },
        action: { type: String, required: true },
        config: Schema.Types.Mixed,
    },
    { timestamps: true }
)

const action = model<IAction>('Action', schema)
export { action as default, IAction }
