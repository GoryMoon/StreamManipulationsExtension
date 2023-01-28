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
import { ITransactionProduct } from '../types'
import { prepareActionSettings, getTwitchJwt, sendErrorStatus } from '../utils'
import {
    gameActionsRequestValidator,
    sendActionRequestValidator,
    transactionReceiptValidator,
} from '../validator'
import { HttpStatusCode } from 'axios'

/**
 * Only allows valid JWT tokens in the authorization header
 */
function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.headers['authorization'])
        try {
            const authorization = req.headers['authorization'].split(' ')
            if (authorization[0] !== 'Bearer') {
                return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'invalid_token')
            } else {
                const jwt = new TwitchEbsTools(process.env.TWITCH_SECRET as string).validateToken(
                    authorization[1]
                )
                if (jwt instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(jwt))
                    return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'expired')

                if (
                    !TwitchEbsTools.verifyViewerOrBroadcaster(jwt) ||
                    !TwitchEbsTools.verifyRole(jwt, 'moderator')
                )
                    return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'bad_role')

                res.locals.jwt = jwt
                return next()
            }
        } catch (err) {
            console.log(err)
            return sendErrorStatus(res, HttpStatusCode.BadRequest, 'error_parsing_token')
        }
    else {
        return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'no_token')
    }
}

/**
 * Only allows broadcaster JWT tokens
 */
function broadcasterMiddleware(req: Request, res: Response, next: NextFunction) {
    const jwt = getTwitchJwt(res)
    if (TwitchEbsTools.verifyBroadcaster(jwt)) return next()
    return sendErrorStatus(res, HttpStatusCode.Forbidden, 'bad_role')
}

async function token(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    const user = await User.findOne({
        channel_id: { $eq: jwt.channel_id },
    })
    if (!_isNil(user)) {
        return res.json({
            token: generateJWT(jwt.channel_id, user.token),
            dev: user.dev,
        })
    } else {
        const token = await newToken(jwt.channel_id)
        return res.json({ token: token, dev: false })
    }
}

async function createToken(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)
    const token = await newToken(jwt.channel_id)
    return res.json({ token: token })
}

async function newToken(channel_id: string) {
    const token = uuid()
    await User.updateOne(
        { channel_id: { $eq: channel_id } },
        { $set: { token: token } },
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

/**
 * Param required: :name
 *
 * Route that returns the supported action data for a game
 */
async function getGameData(req: Request, res: Response) {
    try {
        const game = await Game.findOne({ game: { $eq: req.params.name } })
        if (_isNil(game)) {
            return sendErrorStatus(res, HttpStatusCode.NotFound, 'game_not_found')
        } else if (_isNil(game.data) || game.data.length <= 0) {
            return res.json({ data: [] })
        }

        res.json({ data: game.data })
    } catch (error) {
        return sendErrorStatus(res, HttpStatusCode.NotFound, 'game_not_found')
    }
}

/**
 * Param required: :game
 *
 * Route that returns actions for a specific game from the current channel
 */
async function getGameActions(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)

    try {
        const conf = await Config.findOne({
            channel_id: { $eq: jwt.channel_id },
            game: { $eq: req.params.game },
        })
        if (_isNil(conf) || _isNil(conf.config) || conf.config.length <= 0) {
            return res.json({ data: [] })
        }

        res.json({ data: conf.config })
    } catch (e) {
        return sendErrorStatus(
            res,
            HttpStatusCode.InternalServerError,
            e instanceof Error ? e.message : String(e)
        )
    }
}

/**
 * Param required: /:game
 * Body required
 *
 * Updates the action for a specific game on the current broadcaster channel
 */
async function postGameActions(req: Request, res: Response) {
    const jwt = getTwitchJwt(res)

    if (!gameActionsRequestValidator(req.body))
        return sendErrorStatus(res, HttpStatusCode.BadRequest, 'invalid_config')

    await Config.updateOne(
        { channel_id: { $eq: jwt.channel_id }, game: { $eq: req.params.game } },
        { $set: { config: req.body.config } },
        { upsert: true }
    )
    return res.json({ status: 'saved' })
}

/**
 * Returns a route to handle action messages
 *
 * Body required
 *
 * @param io The IO Server to send events on
 * @param socketVersion The version of the api to use
 */
function sendAction(io: Server, socketVersion: string) {
    return async (req: Request, res: Response) => {
        if (!sendActionRequestValidator(req.body))
            return sendErrorStatus(res, HttpStatusCode.BadRequest, 'invalid_config')
        const data = req.body

        const token = data.token
        let product: ITransactionProduct
        if (process.env.NODE_ENV === 'development') {
            product = data.product
        } else {
            const invalidBits = () => sendErrorStatus(res, HttpStatusCode.Unauthorized, 'bits_not_valid')
            try {
                const bitPayload = new TwitchEbsTools(process.env.TWITCH_SECRET as string).validateToken(
                    token
                )
                if (bitPayload instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(bitPayload))
                    return invalidBits()

                if (!transactionReceiptValidator(bitPayload)) return invalidBits()
                product = bitPayload.data.product
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
                return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'config_not_valid')

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

            if (_isNil(action)) return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'action_not_valid')

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
                    const settings = prepareActionSettings(action.settings)
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

                    return res.json({ status: 'sent' })
                } else {
                    return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'socket_not_valid')
                }
            } catch (_err) {
                return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'channel_not_valid')
            }
        } catch (error) {
            return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'not_valid')
        }
    }
}

function setup(io: Server) {
    const router = express.Router()

    router.use(authMiddleware)

    //Token
    router.get('/token/', broadcasterMiddleware, token)
    router.get('/token/create', broadcasterMiddleware, createToken)

    //Game
    router.get('/game/:name', broadcasterMiddleware, getGameData)

    //Actions
    router.get('/actions/:game', getGameActions)
    router.post('/actions/:game', broadcasterMiddleware, postGameActions)

    //Action sent
    router.post('/action/:game', sendAction(io, 'v1'))
    return router
}

export {
    setup as default,
    authMiddleware,
    broadcasterMiddleware,
    token,
    createToken,
    getGameData,
    getGameActions,
    postGameActions,
    sendAction,
}
