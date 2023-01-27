import express, { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { TwitchEbsTools } from 'twitch-ebs-tools'
import _isEqual from 'lodash/isEqual'
import _isNil from 'lodash/isNil'
import { Server } from 'socket.io'

import User from '../models/user.model'
import Config, { IConfigData } from '../models/config.model'
import Game from '../models/game.model'
import Stat from '../models/stat.model'
import Action from '../models/action.model'
import events from '../events'
import {
    ISendActionRequest,
    IPostGameActionsRequest,
    ITransactionProduct,
    ITransactionReceipt,
} from '../types'
import { getTwitchJwt } from '../utils'
import {
    gameActionsRequestValidator,
    sendActionRequestValidator,
    transactionReceiptValidator,
} from '../validator'

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.headers['authorization']) {
        try {
            const authorization = req.headers['authorization'].split(' ')
            if (authorization[0] !== 'Bearer') {
                return res.status(401).send('invalid_token')
            } else {
                const jwt = new TwitchEbsTools(process.env.TWITCH_SECRET as string).validateToken(
                    authorization[1]
                )
                if (jwt instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(jwt)) {
                    return res.status(401).send('expired')
                }
                res.locals.jwt = jwt
                return next()
            }
        } catch (err) {
            console.log(err)
            return res.status(403).send()
        }
    } else {
        return res.status(401).send('no_token')
    }
}

async function token(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    if (TwitchEbsTools.verifyRole(jwt, 'broadcaster')) {
        const user = await User.findOne({
            channel_id: { $eq: jwt.channel_id },
        })
        if (!_isNil(user)) {
            return res.type('json').json({
                token: generateJWT(jwt.channel_id, user.token),
                dev: user.dev,
            })
        } else {
            const token = await newToken(jwt.channel_id)
            return res.type('json').json({ token: token, dev: false })
        }
    } else {
        return res.status(403).type('json').send()
    }
}

async function createToken(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    if (TwitchEbsTools.verifyRole(jwt, 'broadcaster')) {
        const token = await newToken(jwt.channel_id)
        return res.type('json').json({ token: token })
    } else {
        return res.status(403).type('json').send()
    }
}

async function newToken(channel_id: string) {
    const token = uuid()
    await User.updateOne(
        { channel_id: { $eq: channel_id } },
        { token: token },
        {
            upsert: true,
            setDefaultsOnInsert: true,
        }
    )
    return generateJWT(channel_id, token)
}

function generateJWT(id: string, token: string) {
    const SECRET = Buffer.from(process.env.SECRET as string, 'base64').toString()
    return jwt.sign({ channel_id: id, token: token }, SECRET, { noTimestamp: true })
}

async function getGameData(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    if (!TwitchEbsTools.verifyTokenNotExpired(jwt) || !TwitchEbsTools.verifyBroadcaster(jwt))
        return res.status(401).type('json').json({ status: 'not_valid' })

    try {
        const game = await Game.findOne({ game: { $eq: req.params.name } })
        if (_isNil(game)) {
            return res.status(404).type('json').json({ status: 'game_not_found' })
        } else if (_isNil(game.data) || game.data.length <= 0) {
            return res.type('json').json({ data: [] })
        }

        res.type('json').json({ data: game.data })
    } catch (error) {
        return res.status(404).type('json').json({ status: 'game_not_found' })
    }
}

async function getGameActions(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    if (!TwitchEbsTools.verifyTokenNotExpired(jwt) || !TwitchEbsTools.verifyBroadcaster(jwt))
        return res.status(401).type('json').json({ status: 'not_valid' })

    try {
        const conf = await Config.findOne({
            channel_id: { $eq: jwt.channel_id },
            game: { $eq: req.params.game },
        })
        if (_isNil(conf) || _isNil(conf.config) || conf.config.length <= 0) {
            return res.type('json').json({ data: [] })
        }

        res.type('json').json({ data: conf.config })
    } catch (e) {
        return res
            .status(500)
            .type('json')
            .json({
                status: typeof e === 'object' && e && 'message' in e ? e.message : String(e),
            })
    }
}

async function postGameActions(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    if (!TwitchEbsTools.verifyTokenNotExpired(jwt) || !TwitchEbsTools.verifyBroadcaster(jwt))
        return res.status(401).type('json').json({ status: 'not_valid' })

    const data = req.body as IPostGameActionsRequest
    if (!gameActionsRequestValidator(req.body))
        return res.status(400).type('json').json({ status: 'invalid_config' })

    await Config.updateOne(
        { channel_id: { $eq: jwt.channel_id }, game: { $eq: req.params.game } },
        { config: data.config },
        { upsert: true }
    )
    return res.type('json').json({ status: 'saved' })
}

function sendAction(io: Server, socketVersion: string) {
    return async (req: Request, res: Response) => {
        const data = req.body as ISendActionRequest

        if (!sendActionRequestValidator(data))
            return res.status(400).type('json').json({ status: 'invalid_config' })

        const token = data.token
        let product: ITransactionProduct
        if (process.env.NODE_ENV === 'development') {
            product = data.product
        } else {
            const invalidBits = () => res.status(401).type('json').json({ status: 'bits_not_valid' })
            try {
                const bitPayload = new TwitchEbsTools(process.env.TWITCH_SECRET as string).validateToken(
                    token
                )
                if (bitPayload instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(bitPayload))
                    return invalidBits()

                const recipe = bitPayload as unknown as ITransactionReceipt
                if (!transactionReceiptValidator(recipe)) return invalidBits()

                product = recipe.data.product
            } catch (err) {
                return invalidBits()
            }
        }

        try {
            const jwt = getTwitchJwt(res)
            const cfg = await Config.findOne({
                channel_id: { $eq: jwt.channel_id },
                game: { $eq: req.params.game },
            })
            if (_isNil(cfg) || _isNil(cfg.config) || cfg.config.length <= 0)
                return res.status(401).type('json').json({ status: 'config_not_valid' })

            // Look for action in channel config for the game
            let action: IConfigData | null = null
            for (const a of cfg.config) {
                if (
                    a.action === data.action &&
                    a.sku === product.sku &&
                    _isEqual(a.settings, data.settings)
                ) {
                    action = a
                    break
                }
            }

            if (action === null) return res.status(401).type('json').json({ status: 'action_not_valid' })
            try {
                // Save action in database
                const result = await Action.create({
                    channel_id: jwt.channel_id,
                    game: req.params.game,
                    bits: product.cost.amount,
                    sender: data.user,
                    action: action.action,
                    config: { message: action.message, ...action.settings },
                })
                // Send action to dashboard
                events.emit(['action', jwt.channel_id], result)
            } catch (error) {
                console.error(
                    `Could not save an action to disk: ${data.action} - ${JSON.stringify(data.settings)}`
                )
            }

            try {
                const user = await User.findOne({ channel_id: { $eq: jwt.channel_id } })
                if (!_isNil(user) && !_isNil(user.socket_id)) {
                    // Update the settings from the action, parsing string as json
                    const settings = new Map<string, unknown>()
                    if (!_isNil(action.settings)) {
                        for (const [key, value] of Object.entries(action.settings)) {
                            try {
                                if (typeof value === 'string') settings.set(key, JSON.parse(value))
                                else settings.set(key, value)
                            } catch (error) {
                                settings.set(key, value)
                            }
                        }
                    }
                    console.log(`Sending action: ${action.action} to #${user.channel_name}`)

                    // Send the action to the connected game
                    io.of(`/${socketVersion}`)
                        .to(user.socket_id)
                        .emit('action', {
                            bits: product.cost.amount,
                            user: data.user,
                            action: action.action,
                            settings: { message: action.message, ...settings },
                        })

                    // Increase the stat for the action
                    await Stat.updateOne(
                        { channel_id: { $eq: jwt.channel_id }, game: { $eq: req.params.game } },
                        { $inc: { [`metrics.${action.action}`]: 1 } },
                        { upsert: true }
                    )

                    return res.type('json').json({ status: 'sent' })
                } else {
                    return res.status(401).type('json').json({ status: 'socket_not_valid' })
                }
            } catch (_err) {
                return res.status(401).type('json').json({ status: 'channel_not_valid' })
            }
        } catch (error) {
            return res.status(401).type('json').json({ status: 'not_valid' })
        }
    }
}

function setup(io: Server) {
    const router = express.Router()

    router.use(authMiddleware)

    //Token
    router.get('/token/', token)
    router.get('/token/create', createToken)

    //Game
    router.get('/game/:name', getGameData)

    //Actions
    router.get('/actions/:game', getGameActions)
    router.post('/actions/:game', postGameActions)

    //Action sent
    router.post('/action/:game', sendAction(io, 'v1'))
    return router
}

export {
    setup as default,
    authMiddleware,
    token,
    createToken,
    getGameData,
    getGameActions,
    postGameActions,
    sendAction,
}
