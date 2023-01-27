import { IConfigData } from './models/config.model'
import { JwtPayload } from 'jsonwebtoken'

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
