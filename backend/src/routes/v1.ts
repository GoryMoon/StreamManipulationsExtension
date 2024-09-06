import express, { type NextFunction, type Request } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { TwitchEbsTools } from 'twitch-ebs-tools'
import _isEqual from 'lodash/isEqual'
import _isNil from 'lodash/isNil'

import User from '../models/user.model'
import Config, { type IConfigData } from '../models/config.model'
import Game from '../models/game.model'
import Stat from '../models/stat.model'
import Action from '../models/action.model'
import events from '../events'
import logger from '../logger'
import type { IoServer, ITransactionProduct } from '../types'
import { prepareActionSettings, sendErrorStatus } from '../utils'
import {
    gameActionsRequestValidator,
    sendActionRequestValidator,
    transactionReceiptValidator,
} from '../validator'
import { HttpStatusCode } from 'axios'
import type { IGetActionsParameters, ISendActionParameters, JwtResponse } from './types'

/**
 * Only allows valid JWT tokens in the authorization header
 */
function authMiddleware(req: Request, res: JwtResponse, next: NextFunction) {
    if (req.headers['authorization'])
        try {
            const authorization = req.headers['authorization'].split(' ')
            if (authorization[0] !== 'Bearer') {
                return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'invalid_token')
            } else {
                const jwt = new TwitchEbsTools(process.env.TWITCH_EXTENSTION_SECRET).validateToken(authorization[1])
                if (jwt instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(jwt))
                    return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'expired')

                if (
                    !TwitchEbsTools.verifyViewerOrBroadcaster(jwt) &&
                    !TwitchEbsTools.verifyRole(jwt, 'moderator')
                )
                    return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'bad_role')

                res.locals.jwt = jwt
                return next()
            }
        } catch (err) {
            logger.error(err)
            return sendErrorStatus(res, HttpStatusCode.BadRequest, 'error_parsing_token')
        }
    else {
        return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'no_token')
    }
}

/**
 * Only allows broadcaster JWT tokens
 */
function broadcasterMiddleware(_req: Request, res: JwtResponse, next: NextFunction) {
    if (TwitchEbsTools.verifyBroadcaster(res.locals.jwt)) return next()
    return sendErrorStatus(res, HttpStatusCode.Forbidden, 'bad_role')
}

async function token(_req: Request, res: JwtResponse) {
    const jwt = res.locals.jwt
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

async function createToken(_req: Request, res: JwtResponse) {
    const token = await newToken(res.locals.jwt.channel_id)
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
        },
    )
    return generateJWT(channel_id, token)
}

function generateJWT(id: string, token: string) {
    const SECRET = Buffer.from(process.env.APP_SECRET, 'base64').toString()
    return jwt.sign({ channel_id: id, token: token }, SECRET, { noTimestamp: true })
}

/**
 * Param required: :name
 *
 * Route that returns the supported action data for a game
 */
async function getGameData(req: Request, res: JwtResponse) {
    try {
        const game = await Game.findOne({ game: { $eq: req.params['name'] } })
        if (_isNil(game)) {
            return sendErrorStatus(res, HttpStatusCode.NotFound, 'game_not_found')
        } else if (_isNil(game.data) || game.data.length <= 0) {
            return res.json({ data: [] })
        }

        res.json({ data: game.data })
    } catch {
        return sendErrorStatus(res, HttpStatusCode.NotFound, 'game_not_found')
    }
}

/**
 * Param required: :game
 *
 * Route that returns actions for a specific game from the current channel
 */
async function getGameActions(req: Request<IGetActionsParameters>, res: JwtResponse) {
    try {
        const conf = await Config.findOne({
            channel_id: { $eq: res.locals.jwt.channel_id },
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
            e instanceof Error ? e.message : String(e),
        )
    }
}

/**
 * Param required: /:game
 * Body required
 *
 * Updates the action for a specific game on the current broadcaster channel
 */
async function postGameActions(req: Request, res: JwtResponse) {
    if (!gameActionsRequestValidator(req.body))
        return sendErrorStatus(res, HttpStatusCode.BadRequest, 'invalid_config')

    await Config.updateOne(
        { channel_id: { $eq: res.locals.jwt.channel_id }, game: { $eq: req.params['game'] } },
        { $set: { config: req.body.config } },
        { upsert: true },
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
function sendAction(io: IoServer, socketVersion: string) {
    return async (req: Request<ISendActionParameters>, res: JwtResponse) => {
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
                const bitPayload = new TwitchEbsTools(process.env.TWITCH_EXTENSTION_SECRET).validateToken(token)
                if (bitPayload instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(bitPayload))
                    return invalidBits()

                if (!transactionReceiptValidator(bitPayload)) return invalidBits()
                product = bitPayload.data.product
            } catch {
                return invalidBits()
            }
        }

        try {
            const jwt = res.locals.jwt
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
                events.emit(`action.${jwt.channel_id}`, result)
            } catch (error) {
                logger.error(error)
                logger.error(
                    `Could not save an action to disk: ${data.action} - ${JSON.stringify(data.settings)}`,
                )
            }

            try {
                const user = await User.findOne({ channel_id: { $eq: jwt.channel_id } })
                if (!_isNil(user) && !_isNil(user.socket_id)) {
                    // Update the settings from the action, parsing string as json
                    const settings = prepareActionSettings(action.settings)
                    logger.info(`Sending action: ${action.action} to #${user.channel_name}`)

                    settings.set('message', action.message)

                    // Send the action to the connected game
                    io.of(`/${socketVersion}`).to(user.socket_id).emit('action', {
                        bits: product.cost.amount,
                        user: data.user,
                        action: action.action,
                        settings: settings,
                    })

                    // Increase the stat for the action
                    await Stat.updateOne(
                        { channel_id: { $eq: jwt.channel_id }, game: { $eq: req.params.game } },
                        { $inc: { [`metrics.${action.action}`]: 1 } },
                        { upsert: true },
                    )

                    return res.json({ status: 'sent' })
                } else {
                    return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'socket_not_valid')
                }
            } catch {
                return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'channel_not_valid')
            }
        } catch {
            return sendErrorStatus(res, HttpStatusCode.Unauthorized, 'not_valid')
        }
    }
}

function setup(io: IoServer) {
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
