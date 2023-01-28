import { TwitchPayload } from 'twitch-ebs-tools'
import { TokenJwtPayload } from './types'
import { AddressInfo } from 'net'
import { Response } from 'express'
import { Socket } from 'socket.io'
import _isNil from 'lodash/isNil'
import _isObject from 'lodash/isObject'
import { Types } from 'mongoose'
import _isString from 'lodash/isString'

export function isTokenJwtPayload(obj: unknown): obj is TokenJwtPayload {
    return _isObject(obj) && 'token' in obj
}

export function isTwitchPayload(obj: unknown): obj is TwitchPayload {
    return _isObject(obj) && 'channel_id' in obj
}

export function isAddress(obj: unknown): obj is AddressInfo {
    return _isObject(obj) && 'address' in obj
}

export function getTokenJwt(socket: Socket): TokenJwtPayload {
    if ('jwt' in socket.data.jwt && isTokenJwtPayload(socket.data.jwt)) return socket.data.jwt
    throw new Error('invalid token')
}
export function getTwitchJwt(res: Response): TwitchPayload {
    if ('jwt' in res.locals && isTwitchPayload(res.locals.jwt)) return res.locals.jwt
    throw new Error('invalid token')
}

export function prepareActionSettings(data: Types.Map<unknown>) {
    const settings = new Map<string, unknown>()
    if (!_isNil(data)) {
        for (const [key, value] of Object.entries(data)) {
            try {
                if (_isString(value)) settings.set(key, JSON.parse(value))
                else settings.set(key, value)
            } catch (error) {
                settings.set(key, value)
            }
        }
    }
    return settings
}

export function sendErrorStatus(res: Response, status: number, msg: string) {
    return res.status(status).json({ status: msg })
}
