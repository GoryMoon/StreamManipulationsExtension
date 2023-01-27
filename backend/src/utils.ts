import { TwitchPayload } from 'twitch-ebs-tools'
import { TokenJwtPayload } from './types'
import { AddressInfo } from 'net'
import { Response } from 'express'
import { Socket } from 'socket.io'

function isTokenJwtPayload(obj: unknown): obj is TokenJwtPayload {
    return typeof obj === 'object' && obj !== null && 'token' in obj
}

function isTwitchPayload(obj: unknown): obj is TwitchPayload {
    return typeof obj === 'object' && obj !== null && 'channel_id' in obj
}

function isAddress(obj: unknown): obj is AddressInfo {
    return typeof obj === 'object' && obj !== null && 'address' in obj
}

function getTokenJwt(socket: Socket): TokenJwtPayload {
    if ('jwt' in socket.data.jwt && isTokenJwtPayload(socket.data.jwt)) return socket.data.jwt
    throw new Error('invalid token')
}
function getTwitchJwt(res: Response): TwitchPayload {
    if ('jwt' in res.locals && isTwitchPayload(res.locals.jwt)) return res.locals.jwt
    throw new Error('invalid token')
}

export { isTwitchPayload, isTokenJwtPayload, isAddress, getTokenJwt, getTwitchJwt }
