import { TwitchPayload } from 'twitch-ebs-tools'
import { IConfigData } from './models/config.model'
import { JwtPayload } from 'jsonwebtoken'

export interface IChannelPointAction {
    user: string
    message: string
    id: string
}

export interface IActionRequest {
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

export interface ITransactionReceipt extends TwitchPayload {
    topic: string
    data: ITransactionData
}

export interface TokenJwtPayload extends JwtPayload {
    token: string
    channel_id: string
}
