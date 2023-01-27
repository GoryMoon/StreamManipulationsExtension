import express, { Request, Response } from 'express'
import { TwitchEbsTools } from 'twitch-ebs-tools'
import _assign from 'lodash/assign'
import _pick from 'lodash/pick'
import _get from 'lodash/get'

import Config from '../models/config.model'
import Game from '../models/game.model'
import Twitch from '../twitch'

import { authMiddleware, token, createToken, getGameData, getGameActions, sendAction } from './v1'
import { Server } from 'socket.io'
import { IPostGameActionsRequest } from '../types'
import { getTwitchJwt } from '../utils'
import { gameActionsRequestValidator } from '../validator'

function ping(_req: Request, res: Response) {
    return res.status(200).send()
}

async function getGames(_req: Request, res: Response) {
    const games = await Game.find({})
    return res.type('json').json(
        games.map(game => ({
            id: game.game,
            name: game.name,
            dev: game.dev,
        }))
    )
}

function postGameActions(twitch: Twitch) {
    return async (req: Request, res: Response) => {
        const jwt = getTwitchJwt(res)
        if (!TwitchEbsTools.verifyTokenNotExpired(jwt) || !TwitchEbsTools.verifyBroadcaster(jwt)) {
            return res.status(401).type('json').json({ status: 'not_valid' })
        }
        const actionData = req.body as IPostGameActionsRequest
        if (!gameActionsRequestValidator(req.body))
            return res.status(400).type('json').json({ status: 'invalid_config' })

        const channel_id = jwt.channel_id
        try {
            const game = await Game.findOne({ game: { $eq: req.params.game } })
            if (game !== null) {
                await Config.updateOne(
                    { channel_id: { $eq: channel_id }, game: { $eq: req.params.game } },
                    {
                        channel_id: channel_id,
                        game: req.params.game,
                        config: actionData.config,
                    },
                    { upsert: true }
                )

                // If the user should fetch from api or twitch config if that is to large
                const fetch = new TextEncoder().encode(JSON.stringify(actionData.config)).length > 4500
                try {
                    const data = await twitch.getConfig(channel_id, 'developer')
                    const conf = _get(data, 'content', JSON.stringify({ game: '', fetch }))
                    const merge = _assign({ game: '', fetch }, _pick(JSON.parse(conf), ['game']))

                    await twitch.sendConfig(channel_id, merge, 'developer', '1.1')
                    if (merge.game !== '') {
                        await Promise.all([
                            twitch.sendPubSub(channel_id, {
                                type: 'load',
                                ...merge,
                                actions: !fetch ? actionData.config : [],
                            }),
                            twitch.sendConfig(
                                channel_id,
                                !fetch ? actionData.config : [],
                                'broadcaster',
                                '1.1'
                            ),
                        ])
                    } else {
                        await twitch.sendConfig(channel_id, [], 'broadcaster', '1.1')
                    }
                } catch (e) {
                    console.error(e)
                }

                return res.type('json').json({ status: 'saved' })
            } else {
                return res.type('json').status(400).json({ status: 'game_not_valid' })
            }
        } catch (error) {
            console.error(error)
            return res.type('json').status(400).json({ status: 'game_not_valid' })
        }
    }
}

export default function setup(io: Server) {
    const twitch = new Twitch()
    const router = express.Router()

    router.use(authMiddleware)
    router.head('/ping', ping)

    //Token
    router.get('/token/', token)
    router.get('/token/create', createToken)

    //Game
    router.get('/games', getGames)
    router.get('/game/:name', getGameData)

    //Actions
    router.get('/actions/:game', getGameActions)
    router.post('/actions/:game', postGameActions(twitch))

    //Action sent
    router.post('/action/:game', sendAction(io, 'v2'))
    return router
}
