import { Server } from 'socket.io'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import _pick from 'lodash/pick'
import _isNil from 'lodash/isNil'
import _isString from 'lodash/isString'

import User from './models/user.model'
import Game from './models/game.model'
import Config from './models/config.model'
import Action, { type IAction } from './models/action.model'
import events from './events'
import logger from './logger'

import Twitch from './twitch'
import type {
    ClientToServerEvents,
    IBitsAction,
    IChannelPointAction,
    IDashGame,
    InterServerEvents,
    IoServer,
    IoSocket,
    ServerToClientEvents,
    SocketData,
} from './types'
import { prepareActionSettings, isTokenJwtPayload } from './utils'

export default function (): IoServer {
    const twitch = new Twitch()
    const SECRET = Buffer.from(process.env.APP_SECRET, 'base64')

    const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
        cors: {
            origin: "https://gorymoon.se",
            credentials: true
        },
        allowEIO3: true
    })
    const middleware = async (socket: IoSocket, next: (err?: Error) => void) => {
        const ip = socket.handshake.headers['x-forwarded-for'] ?? socket.handshake.address
        logger.info(`Connection from ${String(ip)}`)
        const token = socket.handshake.auth['token'] as string ?? socket.handshake.query['token'] as string
        if (_isNil(token)) {
            logger.warn('Authentication error: Token was nil')
            return next(new Error('authentication error'))
        } else {
            let data: JwtPayload | string
            try {
                data = jwt.verify(token, SECRET, { complete: false })
            } catch {
                logger.warn(`Authentication error: Failed to verify token ${token}`)
                return next(new Error('authentication error'))
            }
            if (_isString(data)) return next(new Error('authentication error'))

            if (!isTokenJwtPayload(data)) return next(new Error('authentication error'))

            const channelId = data.channel_id
            const user = await User.findOne({
                channel_id: { $eq: channelId },
                token: { $eq: data.token },
            })
            if (!_isNil(user)) {
                socket.data.jwt = data
                logger.info('Connection successful')
                next()
            } else {
                logger.warn(`Authentication error: Couldn't find user with id ${channelId}`)
                next(new Error('authentication error'))
            }
        }
    }

    const dash = io.of('/dashboard')
    dash.use(middleware)
    dash.on('connection', async socket => {
        const jwt = socket.data.jwt

        const user = await User.findOne({ channel_id: { $eq: jwt.channel_id } })
        if (_isNil(user)) 
            throw new Error('Channel not found')

        socket.emit('update_game_connection', getGameData(user.connected_game))
        socket.emit('update_chat_status', 'connect_bot' in user && user.connect_bot === true)

        const config = await Config.findOne({ channel_id: { $eq: jwt.channel_id } })
        if (!_isNil(config)) 
            socket.emit('config', config.config)

        const actionListener = (action: IAction) => {
            socket.emit(
                'dash_action',
                _pick(action, ['_id', 'action', 'bits', 'sender', 'game', 'createdAt']),
            )
        }
        const connectionListener = (connectedGame: string | null) => {
            socket.emit('update_game_connection', getGameData(connectedGame))
        }
        const channelStatusListener = (value: boolean) => {
            socket.emit('update_chat_status', value)
        }
        const cpListener = (action: IChannelPointAction) => {
            socket.emit('chat_msg', action)
        }

        events.on(`action.${jwt.channel_id}`, actionListener)
        events.on(`connection.${jwt.channel_id}`, connectionListener)
        events.on(`channel_status.${jwt.channel_id}`, channelStatusListener)
        events.on(`cp.${jwt.channel_id}`, cpListener)

        socket.on('load_actions', async (offset, callback) => {
            callback(await getActions(jwt.channel_id, offset))
        })

        socket.on('replay_action', async id => {
            const action = await Action.findById(id)
            if (!_isNil(action)) events.emit(`run.${action.channel_id}`, action)
        })

        socket.on('run_action', action => {
            events.emit(`run.${jwt.channel_id}`, action)
        })

        socket.on('set_channel_status', (channel_name, status) => {
            // Send to chat listener
            events.emit('channel_status', jwt.channel_id, channel_name, status)
        })

        socket.on('disconnect', () => {
            events.off(`action.${jwt.channel_id}`, actionListener)
            events.off(`connection.${jwt.channel_id}`, connectionListener)
            events.off(`channel_status.${jwt.channel_id}`, channelStatusListener)
            events.off(`cp.${jwt.channel_id}`, cpListener)
            logger.info('Dashboard: ' + socket.id + ' disconnected')
        })
    })

    function getGameData(gameId: string | null | undefined): IDashGame | null {
        switch (gameId) {
            case 'spaceengineers':
                return { id: gameId, name: 'SpaceEngineers'}

            default:
                return null
        }
    }

    async function getActions(channelId: string, offset: number) {
        return await Action.find<IAction>(
            { channel_id: { $eq: channelId } },
            ['_id', 'action', 'bits', 'sender', 'game', 'createdAt'],
            { limit: 50, sort: { createdAt: -1 }, skip: offset },
        )
    }

    function createReplayListener(socket: IoSocket) {
        return (action: IBitsAction) => {
            const settings = prepareActionSettings(action.settings)
            socket.emit('action', {
                bits: action.bits,
                user: action.user,
                action: action.action,
                settings: settings,
            })
        }
    }

    function createCPListener(socket: IoSocket) {
        return (action: IChannelPointAction) => {
            socket.emit('cp_action', action)
        }
    }

    const v1 = io.of('/v1')
    v1.use(middleware)
    v1.on('connection', async socket => {
        const jwt = socket.data.jwt
        const user = await User.updateOne(
            {
                channel_id: { $eq: jwt.channel_id },
                token: { $eq: jwt.token },
            },
            { $set: { socket_id: socket.id, connected_game: 'spaceengineers' } },
            { upsert: true },
        )

        if (!_isNil(user)) {
            events.emit(`connection.${jwt.channel_id}`, 'spaceengineers')
            await Promise.all([
                twitch.sendPubSub(jwt.channel_id, {
                    mod_active: true,
                }),
                twitch.sendConfig(jwt.channel_id, { mod_active: true }, 'developer', '1.0'),
            ])
        }

        const cpListener = createCPListener(socket)
        const replayListener = createReplayListener(socket)

        events.on(`run.${jwt.channel_id}`, replayListener)
        events.on(`cp.${jwt.channel_id}`, cpListener)

        socket.on('disconnect', async () => {
            await User.updateOne(
                { channel_id: { $eq: jwt.channel_id }, token: { $eq: jwt.token } },
                { socket_id: null, connected_game: null },
            )

            events.emit(`connection.${jwt.channel_id}`, null)
            events.off(`run.${jwt.channel_id}`, replayListener)
            events.off(`cp.${jwt.channel_id}`, cpListener)
            await Promise.all([
                twitch.sendPubSub(jwt.channel_id, { mod_active: false }),
                twitch.sendConfig(jwt.channel_id, { mod_active: false }, 'developer', '1.0'),
            ])
        })
    })

    const v2 = io.of('/v2')
    v2.use(middleware)
    v2.on('connection', async (socket: IoSocket) => {
        const data = socket.data.jwt
        logger.info(`Connected to ${data.channel_id}`)

        const changeGame = async (game?: string) => {
            if (_isNil(game) || game === '') {
                await unload(data.channel_id)
                return
            }
            if (_isNil(await Game.findOne({ game: { $eq: game } }))) throw new Error('game not valid')

            const user = await User.updateOne(
                {
                    channel_id: { $eq: data.channel_id },
                    token: { $eq: data.token },
                },
                { $set: { socket_id: socket.id, connected_game: game } },
                { upsert: true },
            )

            if (!user.acknowledged) return

            events.emit(`connection.${data.channel_id}`, game)

            const cfg = await Config.findOne({
                channel_id: { $eq: data.channel_id },
                game: { $eq: game },
            })
            const fetch = _isNil(cfg)
                ? false
                : new TextEncoder().encode(JSON.stringify(cfg.config)).length > 4500

            const updates: Promise<void>[] = [
                twitch.sendPubSub(data.channel_id, {
                    type: 'load',
                    game,
                    fetch,
                    actions: !fetch ? (_isNil(cfg) ? [] : cfg.config) : [],
                }),
                twitch.sendConfig(data.channel_id, { game, fetch }, 'developer', '1.1'),
            ]
            if (!fetch && !_isNil(cfg) && !_isNil(cfg.config))
                updates.push(twitch.sendConfig(data.channel_id, cfg.config, 'broadcaster', '1.1'))

            await Promise.all(updates)
        }

        const game = socket.handshake.query['game']
        if (_isString(game) && game !== '') {
            await changeGame(game)
        }

        const cpListener = createCPListener(socket)
        const replayListener = createReplayListener(socket)

        async function unload(channel_id: string) {
            events.emit(`connection.${channel_id}`, null)
            events.off(`run.${channel_id}`, replayListener)
            events.off(`cp.${channel_id}`, cpListener)
            await Promise.all([
                twitch.sendPubSub(channel_id, {
                    type: 'unload',
                }),
                twitch.sendConfig(
                    channel_id,
                    {
                        game: '',
                        fetch: false,
                    },
                    'developer',
                    '1.1',
                ),
                twitch.sendConfig(channel_id, [], 'broadcaster', '1.1'),
            ])
        }

        events.on(`run.${data.channel_id}`, replayListener)
        events.on(`cp.${data.channel_id}`, cpListener)

        socket.on('game', changeGame)

        socket.on('disconnect', async () => {
            await User.updateOne(
                { channel_id: { $eq: data.channel_id }, token: { $eq: data.token } },
                { socket_id: null, connected_game: null },
            )
            await unload(data.channel_id)
        })
    })

    return io
}
