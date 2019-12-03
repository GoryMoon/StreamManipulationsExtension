import IO from 'socket.io'
import redisAdapter from 'socket.io-redis';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import moment from 'moment';
import pick from 'lodash.pick'

import User from './models/user.model';
import Config from './models/config.model';
import Action from './models/action.model';
import events from './events';


let inCooldown = {}

const TWITCH_SECRET = Buffer.from(process.env.TWITCH_SECRET, 'base64')
const SECRET = Buffer.from(process.env.SECRET, 'base64')

export default function (server) {
    var io = IO(server)
    io.adapter(redisAdapter({ host: process.env.REDIS, port: process.env.REDIS_PORT }))

    const middleware = (socket, next) => {
        const token = socket.handshake.query.token;
        if (token == undefined) {
            return next(new Error('Authentication error'))
        } else {
            let data;
            try {
                data = jwt.verify(token, SECRET)
            } catch (err) {
                return next(new Error('Authentication error'))
            }

            User.findOne({channel_id: data.channel_id, token: data.token }).then(result => {
                if (result != undefined) {
                    socket.jwt = data
                    next()
                } else {
                    next(new Error('Authentication error'))
                }
            })
        }
    };

    var dash = io.of('/dashboard');
    dash.use(middleware)
    dash.on('connection', (socket) => {
        const data = socket.jwt
        sendActions(socket, data.channel_id, 0)

        User.findOne({ channel_id: data.channel_id }).then((result, err) => {
            socket.emit('update_game_connection', result.socket_id !== null)
            socket.emit('update_chat_status', 'connect_bot' in result && result.connect_bot === true)
        })

        Config.findOne({ channel_id: data.channel_id }).then((result, err) => {
            socket.emit('config', result.config)
        })

        const actionListener = (action) => {
            socket.emit('action', pick(action, [ '_id', 'action', 'bits', 'sender', 'game', 'createdAt' ]))
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
        Action.find({ channel_id: channel_id },
            [ '_id', 'action', 'bits', 'sender', 'game', 'createdAt' ],
            { limit: 50, sort: { createdAt: -1 }, skip: offset }).then((result, err) => {
            if (result !== undefined) {
                socket.emit('connect_actions', result)
            }
        })
    }


    var v1 = io.of('/v1');
    v1.use(middleware)
    v1.on('connection', (socket) => {
        const data = socket.jwt
        User.updateOne({channel_id: data.channel_id, token: data.token }, { socket_id: socket.id }, { upsert: true }).then((res, err) => {
            if (err === undefined) {
                events.emit('connection-' + data.channel_id, true)
                sendPubSub(data.channel_id, {
                    mod_active: true
                })
                sendConfig(data.channel_id, { mod_active: true }, 'developer')
            }
        })

        const replayListener = (action) => {
            let settings = {}
            if (action.config != undefined) {
                for (let [key, value] of Object.entries(action.config)) {
                    try {
                        settings[key] = JSON.parse(value)
                    } catch(error) {
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
            User.updateOne({channel_id: data.channel_id, token: data.token }, { socket_id: null }).then((res, err) => {
                events.emit('connection-' + data.channel_id, false)
                events.removeListener('run-' + data.channel_id, replayListener)
                events.removeListener('cp-' + data.channel_id, cpListener)
                sendPubSub(data.channel_id, {
                    mod_active: false
                })
                sendConfig(data.channel_id, { mod_active: false }, 'developer')
            })
        })
    })


    function sendPubSub(channel_id, message) {
        if (isInCooldown(channel_id)) {
            console.log(`Service is in cooldown: ${channel_id}`)
            return;
        }

        const token = jwt.sign({
            user_id: "25148021",
            role: 'external',
            channel_id: channel_id,
            pubsub_perms: {
                "send": [
                    "broadcast"
                ]
            }
        }, TWITCH_SECRET, {
            expiresIn: '3m'
        })

        axios.post(`https://api.twitch.tv/extensions/message/${channel_id}`, {
            content_type: 'application/json',
            message: JSON.stringify(message),
            targets: ["broadcast"]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        }).catch(err => {
            console.log(err.response);
        })
    }

    function sendConfig(channel_id, content, segment) {
        if (isInCooldown(channel_id !== null ? `${channel_id}-${segment}`: segment)) {
            console.log(`Service is in cooldown: ${channel_id}-${segment}`)
            return;
        }

        const token = jwt.sign({
            user_id: "25148021",
            role: 'external',
        }, TWITCH_SECRET, {
            expiresIn: '3m'
        })

        const body = {
            segment: segment,
            content: JSON.stringify(content),
        }

        if (segment !== 'global') {
            body['channel_id'] = channel_id;
        }

        axios.put(`https://api.twitch.tv/extensions/${process.env.TWITCH_CLIENT_ID}/configurations`, body, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        }).catch(err => {
            console.log(err.response);
        })
    }

    function isInCooldown(channel_id) {
        if (inCooldown[channel_id] != undefined && inCooldown[channel_id].isAfter()) {
            return true;
        }

        inCooldown[channel_id] = moment().add(1, 's')
        return false;
    }
    return io
}