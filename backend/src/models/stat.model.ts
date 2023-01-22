import {Schema, Types, model} from 'mongoose';

interface IStat {
    _id: Types.ObjectId,
    channel_id: string,
    game: string,
    metrics: Map<string, number>
}

const schema = new Schema<IStat>({
    _id: Schema.Types.ObjectId,
    channel_id: String,
    game: String,
    metrics: {type: Map, of: Number},
})

const stat = model<IStat>('Stat', schema)
export {
    stat as default,
    IStat
}
