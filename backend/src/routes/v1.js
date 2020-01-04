import express from 'express';
import jwt from 'jsonwebtoken';
import uuid from 'uuid/v4';
import TwitchEbsTools from 'twitch-ebs-tools';
import _isEqual from 'lodash.isequal';
import _isNil from 'lodash.isnil';
import emitter from 'socket.io-emitter';
const io = emitter({ host: process.env.REDIS, port: process.env.REDIS_PORT })

import User from '../models/user.model'
import Config from '../models/config.model';
import Game from '../models/game.model';
import Stat from '../models/stat.model';
import Action from '../models/action.model';
import events from '../events';

const SECRET = Buffer.from(process.env.SECRET, 'base64').toString()

function auth(req, res, next) {
    if (req.headers['authorization']) {
        try {
            let authorization = req.headers['authorization'].split(' ')
            if (authorization[0] !== 'Bearer') {
                return res.status(401).send('invalid_token')
            } else {
                req.auth = authorization[1]
                req.jwt = new TwitchEbsTools(process.env.TWITCH_SECRET).validateToken(req.auth)
                if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt)) {
                    return res.status(401).send('expired')
                }
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

function token(req, res) {
    if (TwitchEbsTools.verifyRole(req.jwt, 'broadcaster')) {
        User.findOne({ channel_id: req.jwt.channel_id }).then(result => {
            if (!_isNil(result)) {
                return res.type('json').json({token: generateJWT(req.jwt.channel_id, result.token), dev: result.dev})
            } else {
                newToken(req.jwt.channel_id).then(token => {
                    res.type('json').json({token: token, dev: false})
                })
            }
        })
    } else {
        res.status(403).type('json').send()
    }
}

function createToken(req, res) {
    if (TwitchEbsTools.verifyRole(req.jwt, 'broadcaster')) {
        newToken(req.jwt.channel_id).then(token => {
            res.type('json').json({token: token})
        })
    } else {
        res.status(403).type('json').send()
    }
}

function newToken(channel_id) {
    const token = uuid()
    return User.updateOne({ channel_id: channel_id }, { token: token }, { upsert: true, setDefaultsOnInsert: true }).then(_result => {
        return generateJWT(channel_id, token)
    })
}

function generateJWT(id, token) {
    return jwt.sign({channel_id: id, token: token}, SECRET, {noTimestamp: true})
}

async function getGameData(req, res) {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).type('json').json({status: 'not_valid'})
    }

    try {
        const game = await Game.findOne({ game: req.params.name })
        if (_isNil(game.data) || game.data.length <= 0) {
            return res.status(404).type('json').json({status: 'game_not_found'})
        }

        res.type('json').json({data: game.data})
    } catch (error) {
        return res.status(404).type('json').json({status: 'game_not_found'})
    }
}

async function getGameActions(req, res) {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).type('json').json({status: 'not_valid'})
    }

    try {
        const config = await Config.findOne({ channel_id: req.jwt.channel_id, game: req.params.game})
        if (config == null || _isNil(config.config) || config.config.length <= 0) {
            return res.type('json').json({data: []})
        }

        res.type('json').json({data: config.config})
    } catch (e) {
        return res.status(500).type('json').json({status: e.message})
    }
}

function postGameActions(req, res) {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).type('json').json({status: 'not_valid'})
    }
    Config.updateOne(
        { channel_id: req.jwt.channel_id, game: req.params.game },
        { channel_id: req.jwt.channel_id, game: req.params.game, config: req.body.config },
        { upsert: true })
        .then(result => {
            res.type('json').json({status: 'saved'})
        })
}

function sendAction(socketVersion) {
    return async (req, res) => {
        const token = req.body.token;

        let product;
        if (process.env.NODE_ENV === 'development') {
            product = req.body.product
        } else {
            try {
                const bitPayload = new TwitchEbsTools(process.env.TWITCH_SECRET).validateToken(token)
                if (!TwitchEbsTools.verifyTokenNotExpired(bitPayload)) {
                    return res.status(401).type('json').json({status: 'bits_not_valid'})
                }
                product = bitPayload.data.product;
            } catch(err) {
                return res.status(401).type('json').json({status: 'bits_not_valid'})
            }
        }

        try {
            const config = await Config.findOne({ channel_id: req.jwt.channel_id, game: req.params.game })
            if (_isNil(config.config) || config.config.length <= 0) {
                return res.status(401).type('json').json({status: 'config_not_valid'})
            }

            let valid = false;
            let action = null;
            for (action of config.config) {
                if (action.action == req.body.action && action.sku == product.sku && _isEqual(action.settings, req.body.settings)) {
                    valid = true;
                    break;
                }
            }

            if (!valid) {
                return res.status(401).type('json').json({status: 'action_not_valid'})
            }
            try {
                const result = await Action.create({
                    channel_id: req.jwt.channel_id,
                    game: req.params.game,
                    bits: product.cost.amount,
                    sender: req.body.user,
                    action: action.action,
                    config: { message: action.message, ...action.settings }
                })
                events.emit('action-' + req.jwt.channel_id, result)
            } catch (error) {
                console.error('Could not save an action to disk: ' + req.body.action + ' - ' + JSON.stringify(req.body.settings))
            }
            
            User.findOne({ channel_id: req.jwt.channel_id }).then(result => {
                if (!_isNil(result) && result.socket_id !== null) {
                    let settings = {}
                    if (!_isNil(action.settings)) {
                        for (let [key, value] of Object.entries(action.settings)) {
                            try {
                                settings[key] = JSON.parse(value)
                            } catch(error) {
                                settings[key] = value
                            }
                        }
                    }
                    console.log(`Sending action: ${action.action} to #${result.channel_name}`)
                    io.of(`/${socketVersion}`).to(result.socket_id).emit('action', {
                        bits: product.cost.amount,
                        user: req.body.user,
                        action: action.action,
                        settings: { message: action.message, ...settings }
                    })
                    var incObj = {}
                    incObj['metrics.' + action.action] = 1
                    Stat.updateOne({ channel_id: req.jwt.channel_id, game: req.params.game }, { $inc:incObj }, { upsert: true }).then((_result, _err) => {
                        res.type('json').json({status: 'sent'})
                    })
                } else {
                    res.status(401).type('json').json({status: 'socket_not_valid'})
                }
            }).catch(_err => res.status(401).type('json').json({status: 'channel_not_valid'}))
        } catch (error) {
            return res.status(401).type('json').json({status: 'not_valid'})
        }
    }
}
var router = express.Router();

router.use(auth)

//Token
router.get('/token/', token)
router.get('/token/create', createToken)

//Game
router.get('/game/:name', getGameData)

//Actions
router.get('/actions/:game', getGameActions)
router.post('/actions/:game', postGameActions)

//Action sent
router.post('/action/:game', sendAction('v1'))

export {
    router as default,
    auth, token, createToken, getGameData, getGameActions, postGameActions, sendAction
}
