import express, { Request, Response } from 'express'
import _assign from 'lodash/assign'
import _pick from 'lodash/pick'
import _get from 'lodash/get'

import Config from '../models/config.model'
import Game from '../models/game.model'
import Twitch from '../twitch'

import {
    authMiddleware,
    token,
    createToken,
    getGameData,
    getGameActions,
    sendAction,
    broadcasterMiddleware,
} from './v1'
import { Server } from 'socket.io'
import { getTwitchJwt, sendErrorStatus } from '../utils'
import { gameActionsRequestValidator } from '../validator'
import { HttpStatusCode } from 'axios'
import _isNil from 'lodash/isNil'

/**
 * Ping route to check for connectivity and server availability
 */
function ping(_req: Request, res: Response) {
    return res.status(200).send()
}

/**
 * Route that returns supported games
 */
async function getGames(_req: Request, res: Response) {
    const games = await Game.find({})
    return res.json(
        games.map(game => ({
            id: game.game,
            name: game.name,
            dev: game.dev,
        }))
    )
}

/**
 * Returns route that handles action config data saving
 */
function postGameActions() {
    const twitch = new Twitch()

    return async (req: Request, res: Response) => {
        const jwt = getTwitchJwt(res)
        if (!gameActionsRequestValidator(req.body))
            return sendErrorStatus(res, HttpStatusCode.BadRequest, 'invalid_config')

        const actionData = req.body
        const channel_id = jwt.channel_id
        try {
            const game = await Game.findOne({ game: { $eq: req.params.game } })
            if (!_isNil(game)) {
                await Config.updateOne(
                    { channel_id: { $eq: channel_id }, game: { $eq: req.params.game } },
                    {
                        $set: {
                            channel_id: channel_id,
                            game: req.params.game,
                            config: actionData.config,
                        },
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

                return res.json({ status: 'saved' })
            } else {
                return sendErrorStatus(res, HttpStatusCode.BadRequest, 'game_not_valid')
            }
        } catch (error) {
            console.error(error)
            return sendErrorStatus(res, HttpStatusCode.BadRequest, 'game_not_valid')
        }
    }
}

export default function setup(io: Server) {
    const router = express.Router()

    router.use(authMiddleware)
    router.head('/ping', ping)

    //Token
    router.get('/token/', broadcasterMiddleware, token)
    router.get('/token/create', broadcasterMiddleware, createToken)

    //Game
    router.get('/games', broadcasterMiddleware, getGames)
    router.get('/game/:name', broadcasterMiddleware, getGameData)

    //Actions
    router.get('/actions/:game', getGameActions)
    router.post('/actions/:game', broadcasterMiddleware, postGameActions())

    //Action sent
    router.post('/action/:game', sendAction(io, 'v2'))
    return router
}
