import type { Schema } from 'mongoose'
import type { IAction } from './models/action.model'
import type { IConfigData } from './models/config.model'
import type { JwtPayload } from 'jsonwebtoken'
import type { Server, Socket } from 'socket.io'

export interface IChannelPointAction {
    user: string
    message: string
    id: string
}

export interface ISendActionRequest {
    token: string
    product: ITransactionProduct
    user: string
    action: string
    settings: Map<string, unknown>
}

export interface IPostGameActionsRequest {
    config: IConfigData
}

export interface ITransactionProduct {
    domainId: string
    sku: string
    displayName: string
    cost: {
        amount: number
        type: string
    }
}

export interface ITransactionData {
    transactionId: string
    time: string
    userId: string
    product: ITransactionProduct
}

export interface ITransactionReceipt {
    readonly exp: number
    readonly opaque_user_id: string
    readonly channel_id: string
    readonly role: string
    readonly is_unliked: boolean
    readonly pubsub_perms: {
        readonly listen?: ReadonlyArray<string>
        readonly send?: ReadonlyArray<string>
    }
    topic: string
    data: ITransactionData
}

export interface TokenJwtPayload extends JwtPayload {
    token: string
    channel_id: string
}

export interface IDashGame {
    id: string,
    name: string
}

export interface IBitsAction {
    bits: number
    user: string
    action: string
    settings: Map<string, unknown>
}

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
export type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export interface ServerToClientEvents {
    action: (bitAction: IBitsAction) => void
    cp_action: (channelPointAction: IChannelPointAction) => void

    // Dashboard events
    config: (configData: Array<IConfigData>) => void
    dash_action: (action: Partial<IAction>) => void
    update_game_connection: (connectedGame: IDashGame | null) => void
    update_chat_status: (connectBot: boolean) => void
    chat_msg: (channelPointAction: IChannelPointAction) => void
}

export interface ClientToServerEvents {
    game: (game?: string) => void

    // Dashboard events
    run_action: (action: IBitsAction) => void
    replay_action: (id: Schema.Types.ObjectId) => void
    load_actions: (offset: number, callback: (actions: IAction[]) => void) => void
    set_channel_status: (channel_name: string, status: boolean) => void
}

export interface InterServerEvents {
    ping: () => void
}

export interface SocketData {
    jwt: TokenJwtPayload
}
