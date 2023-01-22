import { Schema, Types, Model, model } from 'mongoose';

interface IConfigData {
    title: string,
    description: string,
    action: string,
    message: string,
    sku: string,
    settings: Types.Array<any>
}

interface IConfig {
    _id: Types.ObjectId,
    channel_id: string,
    game: string,
    config: Types.DocumentArray<IConfigData>
}

const data = new Schema<IConfigData>({
    title: {type: String, required: true},
    description: {type: String, required: true},
    action: {type: String, required: true},
    message: {type: String, required: false},
    sku: {type: String, required: true},
    settings: [Schema.Types.Mixed]
})

const schema = new Schema<IConfig, Model<IConfig>>({
    _id: Schema.Types.ObjectId,
    channel_id: {type: String, required: true},
    game: {type: String, required: true},
    config: { type: [data], required: true}
})

const config = model<IConfig>('Config', schema)
export {
    config as default,
    IConfig,
    IConfigData
}
