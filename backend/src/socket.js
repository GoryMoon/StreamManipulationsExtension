import {Server} from 'socket.io'
import jwt from 'jsonwebtoken';
import _pick from 'lodash/pick'
import _isNil from 'lodash/isNil'

import User from './models/user.model';
import Game from './models/game.model';
import Config from './models/config.model';
import Action from './models/action.model';
import events from './events';

import Twitch from './twitch';

export default function () {
    const twitch = new Twitch()
    const SECRET = Buffer.from(process.env.SECRET, 'base64')

    const io = new Server();
    const middleware = (socket, next) => {
        console.log(`Connection from ${socket.handshake.headers['x-forwarded-for']}`);
        const token = socket.handshake.query['token'];
        if (_isNil(token)) {
            console.log('Authentication error: Token was nil');
            return next(new Error('Authentication error'))
        } else {
            let data;
            try {
                data = jwt.verify(token, SECRET)
            } catch (err) {
                console.log(`Authentication error: Failed to verify token ${token}`);
                return next(new Error('Authentication error'))
            }

            User.findOne({channel_id: data.channel_id, token: data.token}).then(result => {
                if (!_isNil(result)) {
                    socket.jwt = data
                    console.log("Connection successful");
                    next()
                } else {
                    console.log(`Authentication error: Couldn't find user with id ${data.channel_id}`);
                    next(new Error('Authentication error'))
                }
            })
        }
    };

    const dash = io.of('/dashboard');
    dash.use(middleware)
    dash.on('connection', (socket) => {
        const data = socket.jwt
        sendActions(socket, data.channel_id, 0)

        User.findOne({channel_id: data.channel_id}).then((result, err) => {
            socket.emit('update_game_connection', result.socket_id !== null)
            socket.emit('update_chat_status', 'connect_bot' in result && result.connect_bot === true)
        })

        Config.findOne({channel_id: data.channel_id}).then((result, err) => {
            socket.emit('config', result.config)
        })

        const actionListener = (action) => {
            socket.emit('action', _pick(action, ['_id', 'action', 'bits', 'sender', 'game', 'createdAt']))
        }
        const connectionListener = (value) => {
            socket.emit('update_game_connection', value)
        }
        const channelStatusListener = (value) => {
            socket.emit('update_chat_status', value)
        }
        const cpListener = (action) => {
            socket.emit('chat_msg', action)
        }

        events.on('action-' + data.channel_id, actionListener)
        events.on('connection-' + data.channel_id, connectionListener)
        events.on('channel_status-' + data.channel_id, channelStatusListener)
        events.on('cp-' + data.channel_id, cpListener)

        socket.on('more-actions', (offset) => {
            sendActions(socket, data.channel_id, offset)
        })

        socket.on('replay', (id) => {
            Action.findById(id).then((result, err) => {
                events.emit('run-' + result.channel_id, result)
            })
        })

        socket.on('run', (action) => {
            events.emit('run-' + data.channel_id, action)
        })

        socket.on('channel_status', (channel_name, status) => {
            events.emit('channel_status', data.channel_id, channel_name, status)
        })

        socket.on('disconnect', () => {
            events.removeListener('action-' + data.channel_id, actionListener)
            events.removeListener('connection-' + data.channel_id, connectionListener)
            events.removeListener('channel_status-' + data.channel_id, channelStatusListener)
            events.removeListener('cp-' + data.channel_id, cpListener)
            console.log("Dashboard: " + socket.id + " disconnected")
        })
    })

    function sendActions(socket, channel_id, offset) {
        Action.find({channel_id: channel_id},
            ['_id', 'action', 'bits', 'sender', 'game', 'createdAt'],
            {limit: 50, sort: {createdAt: -1}, skip: offset}).then((result, err) => {
            if (!_isNil(result)) {
                socket.emit('connect_actions', result)
            }
        })
    }


    const v1 = io.of('/v1');
    v1.use(middleware)
    v1.on('connection', (socket) => {
        const data = socket.jwt
        User.updateOne({
            channel_id: data.channel_id,
            token: data.token
        }, {socket_id: socket.id}, {upsert: true}).then((res, err) => {
            if (_isNil(err)) {
                events.emit('connection-' + data.channel_id, true)
                twitch.sendPubSub(data.channel_id, {
                    mod_active: true
                })
                twitch.sendConfig(data.channel_id, {mod_active: true}, 'developer', '1.0')
            }
        })

        const replayListener = (action) => {
            let settings = {}
            if (!_isNil(action.config)) {
                for (let [key, value] of Object.entries(action.config)) {
                    try {
                        settings[key] = JSON.parse(value)
                    } catch (error) {
                        settings[key] = value
                    }
                }
            }
            socket.emit('action', {
                bits: action.bits,
                user: action.sender,
                action: action.action,
                settings: settings
            })
        }
        const cpListener = (action) => {
            socket.emit('cp_action', {
                user: action.user,
                id: action.id
            })
        }
        events.on('run-' + data.channel_id, replayListener)
        events.on('cp-' + data.channel_id, cpListener)

        socket.on('disconnect', () => {
            User.updateOne({channel_id: data.channel_id, token: data.token}, {socket_id: null})
                .then((_res, _err) => {
                    events.emit('connection-' + data.channel_id, false)
                    events.removeListener('run-' + data.channel_id, replayListener)
                    events.removeListener('cp-' + data.channel_id, cpListener)
                    twitch.sendPubSub(data.channel_id, {
                        mod_active: false
                    })
                    twitch.sendConfig(data.channel_id, {mod_active: false}, 'developer', '1.0')
                })
        })
    })

    const v2 = io.of('/v2');
    v2.use(middleware)
    v2.on('connection', (socket) => {
        const data = socket.jwt
        console.log(`Connected to ${data.channel_id}`);

        const changeGame = (game) => {
            if (_isNil(game) || game === '') {
                unload(data.channel_id)
                return;
            }
            Game.findOne({game}).then((response, err) => {
                if (!(_isNil(err) && !_isNil(response))) {
                    socket.error('Game not valid')
                    socket.disconnect(true)
                    return;
                }

                User.updateOne({
                    channel_id: data.channel_id,
                    token: data.token
                }, {socket_id: socket.id}, {upsert: true}).then((_res, err) => {
                    if (!_isNil(err)) return;

                    Config.findOne({channel_id: data.channel_id, game}).then((res, err) => {
                        if (!_isNil(err)) return;

                        const fetch =
                            _isNil(err) || _isNil(res) || _isNil(res.config) ?
                                false :
                                (new TextEncoder().encode(JSON.stringify(res.config))).length > 4500;
                        twitch.sendPubSub(data.channel_id, {
                            type: 'load',
                            game,
                            fetch,
                            actions: !fetch ? (_isNil(res) || _isNil(res.config) ? [] : res.config) : []
                        })
                        twitch.sendConfig(data.channel_id, {
                            game,
                            fetch
                        }, 'developer', '1.1')
                        if (!fetch && !_isNil(res) && !_isNil(res.config)) {
                            twitch.sendConfig(data.channel_id, res.config, 'broadcaster', '1.1')
                        }
                        events.emit('connection-' + data.channel_id, true)
                    })
                })
            })
        }

        const game = socket.handshake.query.game
        if (!_isNil(game) && game !== '') {
            changeGame(game)
        }

        const replayListener = (action) => {
            let settings = {}
            if (!_isNil(action.config)) {
                for (let [key, value] of Object.entries(action.config)) {
                    try {
                        settings[key] = JSON.parse(value)
                    } catch (error) {
                        settings[key] = value
                    }
                }
            }
            socket.emit('action', {
                bits: action.bits,
                user: action.sender,
                action: action.action,
                settings: settings
            })
        }
        const cpListener = (action) => {
            socket.emit('cp_action', {
                user: action.user,
                id: action.id
            })
        }

        function unload(channel_id) {
            events.emit('connection-' + channel_id, false)
            events.removeListener('run-' + channel_id, replayListener)
            events.removeListener('cp-' + channel_id, cpListener)
            twitch.sendPubSub(channel_id, {
                type: 'unload'
            })
            twitch.sendConfig(channel_id, {
                game: '',
                fetch: false,
            }, 'developer', '1.1')
            twitch.sendConfig(channel_id, [], 'broadcaster', '1.1')
        }

        events.on('run-' + data.channel_id, replayListener)
        events.on('cp-' + data.channel_id, cpListener)

        socket.on('game', changeGame)

        socket.on('disconnect', () => {
            User.updateOne({channel_id: data.channel_id, token: data.token}, {socket_id: null})
                .then((_res, _err) => {
                    unload(data.channel_id)
                })
        })
    })

    return io
}
