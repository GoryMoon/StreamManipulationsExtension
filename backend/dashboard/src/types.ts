export interface IDashAction {
    _id: string
    action: string
    game: string
    bits: number
    sender: string
    createdAt: string
}

export interface IBitsAction {
    bits: number
    user: string
    action: string
    settings: Map<string, unknown>
}

export interface IChannelPointAction {
    user: string
    message: string
    id: string
}

export interface IConfigData {
    title: string
    description: string
    action: string
    message: string
    sku: string
    settings: Map<string, unknown>
}

export interface IDashGame {
    id: string,
    name: string
}
