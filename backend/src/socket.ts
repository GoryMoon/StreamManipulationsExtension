import { Server, Socket } from 'socket.io'
import jwt, { JwtPayload } from 'jsonwebtoken'
import _pick from 'lodash/pick'
import _isNil from 'lodash/isNil'

import User from './models/user.model'
import Game from './models/game.model'
import Config from './models/config.model'
import Action, { IAction } from './models/action.model'
import events from './events'

import Twitch from './twitch'
import { ExtendedError } from 'socket.io/dist/namespace'
import { IChannelPointAction } from './types'
import { getTokenJwt, isTokenJwtPayload } from './utils'

export default function (): Server {
    const twitch = new Twitch()
    const rawSecret = process.env.SECRET as string
    const secret = Buffer.from(rawSecret, 'base64')

    const io = new Server()
    const middleware = async (socket: Socket, next: (err?: ExtendedError) => void) => {
        const ip = socket.handshake.headers['x-forwarded-for']
        console.log(`Connection from ${String(ip)}`)
        const token = socket.handshake.query['token'] as string
        if (_isNil(token)) {
            console.log('Authentication error: Token was nil')
            return next(new Error('authentication error'))
        } else {
            let data: JwtPayload | string
            try {
                data = jwt.verify(token, secret, { complete: false })
            } catch (err) {
                console.log(`Authentication error: Failed to verify token ${token}`)
                return next(new Error('authentication error'))
            }
            if (typeof data === 'string') return next(new Error('authentication error'))

            if (!isTokenJwtPayload(data)) return next(new Error('authentication error'))

            const channelId = data.channel_id
            const user = await User.findOne({
                channel_id: channelId,
                token: data.token,
            })
            if (!_isNil(user)) {
                socket.data.jwt = data
                console.log('Connection successful')
                next()
            } else {
                console.log(`Authentication error: Couldn't find user with id ${channelId}`)
                next(new Error('authentication error'))
            }
        }
    }

    const dash = io.of('/dashboard')
    dash.use(middleware)
    dash.on('connection', async socket => {
        const jwt = getTokenJwt(socket)
        await sendActions(socket, jwt.channel_id, 0)

        const user = await User.findOne({ channel_id: jwt.channel_id })
        if (_isNil(user)) throw new Error('Channel not found')

        socket.emit('update_game_connection', user.socket_id !== null)
        socket.emit('update_chat_status', 'connect_bot' in user && user.connect_bot === true)

        const config = await Config.findOne({ channel_id: jwt.channel_id })
        if (!_isNil(config)) socket.emit('config', config.config)

        const actionListener = (action: IAction) => {
            socket.emit('action', _pick(action, ['_id', 'action', 'bits', 'sender', 'game', 'createdAt']))
        }
        const connectionListener = (value: boolean) => {
            socket.emit('update_game_connection', value)
        }
        const channelStatusListener = (value: boolean) => {
            socket.emit('update_chat_status', value)
        }
        const cpListener = (action: IChannelPointAction) => {
            socket.emit('chat_msg', action)
        }

        events.on(['action', jwt.channel_id], actionListener)
        events.on(['connection', jwt.channel_id], connectionListener)
        events.on(['channel_status', jwt.channel_id], channelStatusListener)
        events.on(['cp', jwt.channel_id], cpListener)

        socket.on('more-actions', async (offset: number) => {
            await sendActions(socket, jwt.channel_id, offset)
        })

        socket.on('replay', async id => {
            const action = await Action.findById(id)
            if (!_isNil(action)) events.emit(['run', action.channel_id], action)
        })

        socket.on('run', action => {
            events.emit(['run', jwt.channel_id], action)
        })

        socket.on('channel_status', (channel_name, status) => {
            events.emit('channel_status', jwt.channel_id, channel_name, status)
        })

        socket.on('disconnect', () => {
            events.off(['action', jwt.channel_id], actionListener)
            events.off(['connection', jwt.channel_id], connectionListener)
            events.off(['channel_status', jwt.channel_id], channelStatusListener)
            events.off(['cp', jwt.channel_id], cpListener)
            console.log('Dashboard: ' + socket.id + ' disconnected')
        })
    })

    async function sendActions(socket: Socket, channelId: string, offset: number) {
        const action = await Action.find(
            { channel_id: channelId },
            ['_id', 'action', 'bits', 'sender', 'game', 'createdAt'],
            { limit: 50, sort: { createdAt: -1 }, skip: offset }
        )

        if (!_isNil(action)) socket.emit('connect_actions', action)
    }

    function createReplayListener(socket: Socket) {
        return (action: IAction) => {
            const settings = new Map<string, unknown>()
            if (!_isNil(action.config)) {
                for (const [key, value] of Object.entries(action.config)) {
                    try {
                        if (typeof value === 'string') settings.set(key, JSON.parse(value))
                        else settings.set(key, value)
                    } catch (error) {
                        settings.set(key, value)
                    }
                }
            }
            socket.emit('action', {
                bits: action.bits,
                user: action.sender,
                action: action.action,
                settings: settings,
            })
        }
    }

    function createCPListener(socket: Socket) {
        return (action: IChannelPointAction) => {
            socket.emit('cp_action', {
                user: action.user,
                id: action.id,
            })
        }
    }

    const v1 = io.of('/v1')
    v1.use(middleware)
    v1.on('connection', async socket => {
        const jwt = getTokenJwt(socket)
        const user = await User.updateOne(
            {
                channel_id: jwt.channel_id,
                token: jwt.token,
            },
            { socket_id: socket.id },
            { upsert: true }
        )

        if (!_isNil(user)) {
            events.emit(['connection', jwt.channel_id], true)
            await Promise.all([
                twitch.sendPubSub(jwt.channel_id, {
                    mod_active: true,
                }),
                twitch.sendConfig(jwt.channel_id, { mod_active: true }, 'developer', '1.0'),
            ])
        }

        const cpListener = createCPListener(socket)
        const replayListener = createReplayListener(socket)

        events.on(['run', jwt.channel_id], replayListener)
        events.on(['cp', jwt.channel_id], cpListener)

        socket.on('disconnect', async () => {
            await User.updateOne({ channel_id: jwt.channel_id, token: jwt.token }, { socket_id: null })

            events.emit(['connection', jwt.channel_id], false)
            events.off(['run', jwt.channel_id], replayListener)
            events.off(['cp', jwt.channel_id], cpListener)
            await Promise.all([
                twitch.sendPubSub(jwt.channel_id, { mod_active: false }),
                twitch.sendConfig(jwt.channel_id, { mod_active: false }, 'developer', '1.0'),
            ])
        })
    })

    const v2 = io.of('/v2')
    v2.use(middleware)
    v2.on('connection', async (socket: Socket) => {
        const data = getTokenJwt(socket)
        console.log(`Connected to ${data.channel_id}`)

        const changeGame = async (game?: string) => {
            if (_isNil(game) || game === '') {
                await unload(data.channel_id)
                return
            }
            if (_isNil(await Game.findOne({ game }))) throw new Error('game not valid')

            const user = await User.updateOne(
                {
                    channel_id: data.channel_id,
                    token: data.token,
                },
                { socket_id: socket.id },
                { upsert: true }
            )

            if (!user.acknowledged) return

            const cfg = await Config.findOne({
                channel_id: data.channel_id,
                game,
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
            events.emit(['connection', data.channel_id], true)
        }

        const game = socket.handshake.query.game
        if (!_isNil(game) && game !== '' && typeof game === 'string') {
            await changeGame(game)
        }

        const cpListener = createCPListener(socket)
        const replayListener = createReplayListener(socket)

        async function unload(channel_id: string) {
            events.emit(['connection', channel_id], false)
            events.off(['run', channel_id], replayListener)
            events.off(['cp', channel_id], cpListener)
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
                    '1.1'
                ),
                twitch.sendConfig(channel_id, [], 'broadcaster', '1.1'),
            ])
        }

        events.on(['run', data.channel_id], replayListener)
        events.on(['cp', data.channel_id], cpListener)

        socket.on('game', changeGame)

        socket.on('disconnect', async () => {
            await User.updateOne({ channel_id: data.channel_id, token: data.token }, { socket_id: null })
            await unload(data.channel_id)
        })
    })

    return io
}
