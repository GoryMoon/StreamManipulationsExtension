import type { TwitchPayload } from 'twitch-ebs-tools'
import type { TokenJwtPayload } from './types'
import type { AddressInfo } from 'net'
import _isNil from 'lodash/isNil'
import _isObject from 'lodash/isObject'
import _isString from 'lodash/isString'
import type { JwtResponse } from './routes/types'

export function isTokenJwtPayload(obj: unknown): obj is TokenJwtPayload {
    return _isObject(obj) && 'token' in obj
}

export function isTwitchPayload(obj: unknown): obj is TwitchPayload {
    return _isObject(obj) && 'channel_id' in obj
}

export function isAddress(obj: unknown): obj is AddressInfo {
    return _isObject(obj) && 'address' in obj
}

export function prepareActionSettings(data: Map<string, unknown>) {
    const settings = new Map<string, unknown>()
    if (!_isNil(data)) {
        for (const [key, value] of Object.entries(data)) {
            try {
                if (_isString(value)) settings.set(key, JSON.parse(value))
                else settings.set(key, value)
            } catch {
                settings.set(key, value)
            }
        }
    }
    return settings
}

export function sendErrorStatus(res: JwtResponse, status: number, msg: string) {
    return res.status(status).json({ status: msg })
}
