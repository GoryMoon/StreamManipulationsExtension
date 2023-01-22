import express, {Request, Response, NextFunction} from 'express';
import {ParamsDictionary} from "express-serve-static-core";
import jwt from 'jsonwebtoken';
import {v4 as uuid} from 'uuid';
import {TwitchEbsTools} from 'twitch-ebs-tools';
import _isEqual from 'lodash/isEqual';
import _isNil from 'lodash/isNil';
import {Server} from "socket.io";

import User from '../models/user.model'
import Config, {IConfigData} from '../models/config.model';
import Game from '../models/game.model';
import Stat from '../models/stat.model';
import Action from '../models/action.model';
import events from '../events';
import {IActionRequest, ITransactionProduct, ITransactionReceipt} from "../types";

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.headers['authorization']) {
        try {
            let authorization = req.headers['authorization'].split(' ')
            if (authorization[0] !== 'Bearer') {
                return res.status(401).send('invalid_token')
            } else {
                const jwt = new TwitchEbsTools(process.env.TWITCH_SECRET as string).validateToken(authorization[1])
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
    if (TwitchEbsTools.verifyRole(res.locals.jwt, 'broadcaster')) {
        const user = await User.findOne({channel_id: res.locals.jwt.channel_id})
        if (!_isNil(user)) {
            return res.type('json').json({
                token: generateJWT(res.locals.jwt.channel_id, user.token),
                dev: user.dev
            })
        } else {
            const token = await newToken(res.locals.jwt.channel_id)
            return res.type('json').json({token: token, dev: false})
        }
    } else {
        return res.status(403).type('json').send()
    }
}

async function createToken(req: Request, res: Response) {
    if (TwitchEbsTools.verifyRole(res.locals.jwt, 'broadcaster')) {
        const token = await newToken(res.locals.jwt.channel_id)
        return res.type('json').json({token: token})
    } else {
        return res.status(403).type('json').send()
    }
}

async function newToken(channel_id: string) {
    const token = uuid()
    await User.updateOne({channel_id: channel_id}, {token: token}, {
        upsert: true,
        setDefaultsOnInsert: true
    })
    return generateJWT(channel_id, token)
}

function generateJWT(id: string, token: string) {
    const SECRET = Buffer.from(process.env.SECRET as string, 'base64').toString()
    return jwt.sign({channel_id: id, token: token}, SECRET, {noTimestamp: true})
}

async function getGameData(req: Request, res: Response) {
    if (!TwitchEbsTools.verifyTokenNotExpired(res.locals.jwt) || !TwitchEbsTools.verifyBroadcaster(res.locals.jwt)) {
        return res.status(401).type('json').json({status: 'not_valid'})
    }

    try {
        const game = await Game.findOne({game: req.params.name})
        if (_isNil(game)) {
            return res.status(404).type('json').json({status: 'game_not_found'})
        } else if (_isNil(game.data) || game.data.length <= 0) {
            return res.type('json').json({data: []})
        }

        res.type('json').json({data: game.data})
    } catch (error) {
        return res.status(404).type('json').json({status: 'game_not_found'})
    }
}

async function getGameActions(req: Request, res: Response) {
    if (!TwitchEbsTools.verifyTokenNotExpired(res.locals.jwt) || !TwitchEbsTools.verifyBroadcaster(res.locals.jwt)) {
        return res.status(401).type('json').json({status: 'not_valid'})
    }

    try {
        const config = await Config.findOne({channel_id: res.locals.jwt.channel_id, game: req.params.game})
        if (_isNil(config) || _isNil(config.config) || config.config.length <= 0) {
            return res.type('json').json({data: []})
        }

        res.type('json').json({data: config.config})
    } catch (e: any) {
        return res.status(500).type('json').json({status: e.message})
    }
}

async function postGameActions(req: Request, res: Response) {
    if (!TwitchEbsTools.verifyTokenNotExpired(res.locals.jwt) || !TwitchEbsTools.verifyBroadcaster(res.locals.jwt))
        return res.status(401).type('json').json({status: 'not_valid'})

    await Config.updateOne(
        {channel_id: res.locals.jwt.channel_id, game: req.params.game},
        {channel_id: res.locals.jwt.channel_id, game: req.params.game, config: req.body.config},
        {upsert: true})
    return res.type('json').json({status: 'saved'})
}

function sendAction(io: Server, socketVersion: string) {
    return async (req: Request<ParamsDictionary, {}, IActionRequest>, res: Response) => {
        const token = req.body.token;

        let product: ITransactionProduct;
        if (process.env.NODE_ENV === 'development') {
            product = req.body.product
        } else {
            try {
                const bitPayload = new TwitchEbsTools(process.env.TWITCH_SECRET as string).validateToken(token)
                if (bitPayload instanceof Error || !TwitchEbsTools.verifyTokenNotExpired(bitPayload))
                    return res.status(401).type('json').json({status: 'bits_not_valid'})

                product = (bitPayload as ITransactionReceipt).data.product;
            } catch (err) {
                return res.status(401).type('json').json({status: 'bits_not_valid'})
            }
        }

        try {
            const cfg = await Config.findOne({channel_id: res.locals.jwt.channel_id, game: req.params.game})
            if (_isNil(cfg) || _isNil(cfg.config) || cfg.config.length <= 0) {
                return res.status(401).type('json').json({status: 'config_not_valid'})
            }

            let action: IConfigData | null = null
            for (let a of cfg.config) {
                if (a.action === req.body.action && a.sku === product.sku && _isEqual(a.settings, req.body.settings)) {
                    action = a
                    break;
                }
            }

            if (action === null) {
                return res.status(401).type('json').json({status: 'action_not_valid'})
            }
            try {
                const result = await Action.create({
                    channel_id: res.locals.jwt.channel_id,
                    game: req.params.game,
                    bits: product.cost.amount,
                    sender: req.body.user,
                    action: action.action,
                    config: {message: action.message, ...action.settings}
                })
                events.emit(['action', res.locals.jwt.channel_id], result)
            } catch (error) {
                console.error('Could not save an action to disk: ' + req.body.action + ' - ' + JSON.stringify(req.body.settings))
            }

            try {
                const user = await User.findOne({channel_id: res.locals.jwt.channel_id})
                if (!_isNil(user) && !_isNil(user.socket_id)) {
                    let settings: Partial<any> = {}
                    if (!_isNil(action.settings)) {
                        for (let [key, value] of Object.entries(action.settings)) {
                            try {
                                settings[key] = JSON.parse(value)
                            } catch (error) {
                                settings[key] = value
                            }
                        }
                    }
                    console.log(`Sending action: ${action.action} to #${user.channel_name}`)
                    io.of(`/${socketVersion}`).to(user.socket_id).emit('action', {
                        bits: product.cost.amount,
                        user: req.body.user,
                        action: action.action,
                        settings: {message: action.message, ...settings}
                    })

                    await Stat.updateOne({
                        channel_id: res.locals.jwt.channel_id,
                        game: req.params.game
                    }, {$inc: {[`metrics.${action.action}`]: 1}}, {upsert: true})

                    res.type('json').json({status: 'sent'})
                } else {
                    res.status(401).type('json').json({status: 'socket_not_valid'})
                }
            } catch (_err) {
                res.status(401).type('json').json({status: 'channel_not_valid'})
            }
        } catch (error) {
            return res.status(401).type('json').json({status: 'not_valid'})
        }
    }
}

function setup(io: Server) {
    const router = express.Router();

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
    authMiddleware, token, createToken, getGameData, getGameActions, postGameActions, sendAction
}
