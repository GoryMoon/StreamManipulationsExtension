import {Schema, Model, Types, model} from 'mongoose';

interface IGameSetting {
    title: string,
    description: string,
    key: string,
    type: string,
    min: string,
    max: string,
    default: number | boolean | string,
    random: boolean | undefined
}

interface IGameData {
    action: string,
    title: string,
    description: string,
    message: true,
    settings: Types.DocumentArray<IGameSetting>
}

interface IGame {
    _id: Types.ObjectId,
    game: string,
    name: string,
    dev: boolean,
    data: Types.DocumentArray<IGameData>
}


const gameSettings = new Schema<IGameSetting>({
    title: {type: String, required: true},
    description: {type: String, required: true},
    key: {type: String, required: true},
    type: {type: String, required: true},
    min: String,
    max: String,
    default: {type: String, required: true},
    random: Boolean
})

const gameData = new Schema<IGameData>({
    action: {type: String, required: true},
    title: {type: String, required: true},
    description: {type: String, required: true},
    message: {type: Boolean, required: true},
    settings: {
        type: [gameSettings], required: false
    }
})

const schema = new Schema<IGame, Model<IGame>>({
    _id: Schema.Types.ObjectId,
    game: {type: String, required: true},
    name: {type: String, required: true},
    dev: {type: Boolean, required: true},
    data: {
        type: [gameData], required: true
    }
})

const game = model<IGame>('Game', schema)
export {
    game as default,
    IGame,
    IGameData,
    IGameSetting
}
