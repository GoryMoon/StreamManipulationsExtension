import type { Response } from 'express'
import type { TwitchPayload } from 'twitch-ebs-tools'

export interface ISendActionParameters {
    game: string
}

export interface IGetActionsParameters {
    game: string
}

interface JwtLocals {
    jwt: TwitchPayload
}

export type JwtResponse = Response<unknown, JwtLocals>
