import express from 'express';
import jwt from "jsonwebtoken";
import uuid from "uuid/v4";
import TwitchEbsTools from 'twitch-ebs-tools';
import isEqual from "lodash.isequal";
import emitter from "socket.io-emitter";
const io = emitter({ host: process.env.REDIS, port: process.env.REDIS_PORT })

import User from "../models/user.model"
import Config from "../models/config.model";
import Game from "../models/game.model";
import Stat from "../models/stat.model";

var router = express.Router();
const SECRET = Buffer.from(process.env.SECRET, 'base64').toString()

router.use((req, res, next) => {
    if (req.headers['authorization']) {
        try {
            let authorization = req.headers['authorization'].split(' ')
            if (authorization[0] !== 'Bearer') {
                return res.status(401).send()
            } else {
                req.auth = authorization[1]
                //TODO Until twitch review to let tokens through
                req.jwt = jwt.verify(req.auth, Buffer.from(process.env.TWITCH_SECRET, 'base64'), { ignoreExpiration: true });
                /*req.jwt = new TwitchEbsTools(process.env.TWITCH_SECRET).validateToken(req.auth)
                if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt)) {
                    return res.status(401).send()
                }*/
                return next()
            }
        } catch (err) {
            console.log(err)
            return res.status(403).send()
        }
    } else {
        return res.status(401).send()
    }
})

//Token
router.get('/token/', (req, res, next) => {
    if (TwitchEbsTools.verifyRole(req.jwt, 'broadcaster')) {
        User.findOne({ channel_id: req.jwt.channel_id }).then(result => {
            if (result != undefined) {
                return res.json({token: generateJWT(req.jwt.channel_id, result.token)})
            } else {
                createToken(req.jwt.channel_id).then(token => {
                    res.json({token: token})
                })
            }
        })
    } else {
        res.status(403).send()
    }
})

router.get('/token/create', (req, res, next) => {
    if (TwitchEbsTools.verifyRole(req.jwt, 'broadcaster')) {
        createToken(req.jwt.channel_id).then(token => {
            res.json({token: token})
        })
    } else {
        res.status(403).send()
    }
})

function createToken(channel_id) {
    const token = uuid()
    return User.updateOne({ channel_id: channel_id }, { token: token}, { upsert: true, setDefaultsOnInsert: true }).then(result => {
        return generateJWT(channel_id, token)
    })
}

function generateJWT(id, token) {
    return jwt.sign({channel_id: id, token: token}, SECRET, {noTimestamp: true})
}


//Game
router.get('/game/:name', async (req, res, next) => {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).json({status: 'not_valid'})
    }

    try {
        const game = await Game.findOne({ game: req.params.name })
        if (game.data == undefined || game.data.length <= 0) {
            return res.status(404).json({status: 'game_not_found'})
        }

        res.json({data: game.data})
    } catch (error) {
        return res.status(404).json({status: 'game_not_found'})
    }
})


//Actions
router.get('/actions/:game', async (req, res, next) => {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).json({status: 'not_valid'})
    }

    try {
        const config = await Config.findOne({ channel_id: req.jwt.channel_id, game: req.params.game})
        if (config.config == undefined || config.config.length <= 0) {
            return res.status(401).json({status: 'not_valid'})
        }

        res.json({data: config.config})
    } catch (error) {
        return res.status(401).json({status: 'not_valid'})
    }
})

router.post('/actions/:game', (req, res, next) => {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).json({status: 'not_valid'})
    }
    Config.updateOne(
        { channel_id: req.jwt.channel_id, game: req.params.game },
        { channel_id: req.jwt.channel_id, game: req.params.game, config: req.body.config },
        { upsert: true }).then(result => {
            res.json({status: result})
        })
})


//Action sent
router.post('/action/:game', async (req, res, next) => {
    const token = req.body.token;

    let bitPayload;
    try {
        bitPayload = new TwitchEbsTools(process.env.TWITCH_SECRET).validateToken(token)
        if (!TwitchEbsTools.verifyTokenNotExpired(bitPayload)) {
            return res.status(401).json({status: 'bits_not_valid'})
        }
    } catch(err) {
        return res.status(401).json({status: 'bits_not_valid'})
    }

    try {
        const config = await Config.findOne({ channel_id: req.jwt.channel_id, game: req.params.game })
        if (config.config == undefined || config.config.length <= 0) {
            return res.status(401).json({status: 'config_not_valid'})
        }

        let valid = false;
        let action = null;
        for (action of config.config) {
            if (action.action == req.body.action && action.sku == bitPayload.data.product.sku && isEqual(action.settings, req.body.settings)) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            return res.status(401).json({status: 'action_not_valid'})
        }
        
        User.findOne({ channel_id: req.jwt.channel_id }).then(result => {
            if (result != undefined && result.socket_id != null) {
                io.to(result.socket_id).emit('action', {
                    bits: bitPayload.data.product.cost.amount,
                    user: req.body.user,
                    action: action.action,
                    settings: { message: action.message, ...action.settings }
                })
                var incObj = {}
                incObj['metrics.' + action.action] = 1
                Stat.updateOne({ channel_id: req.jwt.channel_id, game: req.params.game }, { $inc:incObj }, { upsert: true }).then((result, err) => {
                    res.json({status: 'sent'})
                })
            } else {
                res.status(401).json({status: 'socket_not_valid'})
            }
        }).catch(err => res.status(401).json({status: 'channel_not_valid'}))
    } catch (error) {
        return res.status(401).json({status: 'not_valid'})
    }
})

export default router;