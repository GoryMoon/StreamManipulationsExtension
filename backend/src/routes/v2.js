import express from 'express';
import TwitchEbsTools from 'twitch-ebs-tools';
import _assign from 'lodash.assign';
import _pick from 'lodash.pick';
import _get from 'lodash.get'

import Config from '../models/config.model';
import Game from '../models/game.model';
import { sendConfig, sendPubSub, getConfig } from '../twitch';

import {
    auth, token, createToken, getGameData, getGameActions, sendAction
} from './v1';

function ping(_req, res) {
    res.status(200).send()
}

async function getGames(_req, res) {
    var games = await Game.find({})
    return res.type('json').json(games.map(game => ({ id: game.game, name: game.name, dev: game.dev })))
}

function postGameActions(req, res) {
    if (!TwitchEbsTools.verifyTokenNotExpired(req.jwt) || !TwitchEbsTools.verifyBroadcaster(req.jwt)) {
        return res.status(401).type('json').json({status: 'not_valid'})
    }
    const channel_id = req.jwt.channel_id
    Game.findOne({ game: req.params.game })
        .then(game => {
            if (game !== null) {
                Config.updateOne(
                    { channel_id: channel_id, game: req.params.game },
                    { channel_id: channel_id, game: req.params.game, config: req.body.config },
                    { upsert: true })
                    .then(async _result => {
                        const fetch = (new TextEncoder().encode(JSON.stringify(req.body.config))).length > 4500;
                        try {
                            const data = await getConfig(channel_id, 'developer')
                            const conf = _get(data, `developer:${channel_id}.record.content`, JSON.stringify({ game: '', fetch }))
                            const merge = _assign({ game: '', fetch }, _pick(JSON.parse(conf), ['game']))
                            sendConfig(channel_id, merge, 'developer', '1.1')
                            if (merge.game !== '') {
                                sendPubSub(channel_id, {
                                    type: 'load',
                                    ...merge,
                                    actions: !fetch ? req.body.config: []
                                })
                                sendConfig(channel_id, !fetch ? req.body.config: [], 'broadcaster', '1.1')
                            } else {
                                sendConfig(channel_id, [], 'broadcaster', '1.1')
                            }
                        } catch(e) {
                            console.error(e)
                        }
                        
                        res.type('json').json({status: 'saved'})
                    })
            } else {
                res.type('json').status(400).json({status: 'game_not_valid'})
            }
        })
        .catch(err => {
            console.error(err)
            res.type('json').status(400).json({status: 'game_not_valid'})
        })
}

var router = express.Router();

router.use(auth)
router.head('/ping', ping)

//Token
router.get('/token/', token)
router.get('/token/create', createToken)

//Game
router.get('/games', getGames)
router.get('/game/:name', getGameData)

//Actions
router.get('/actions/:game', getGameActions)
router.post('/actions/:game', postGameActions)

//Action sent
router.post('/action/:game', sendAction('v2'))

export default router;