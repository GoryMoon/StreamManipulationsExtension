import IO from 'socket.io'
import redisAdapter from "socket.io-redis";
import jwt from "jsonwebtoken";
import axios from 'axios';

import User from "./models/user.model";
import moment from 'moment';

let inCooldown = {}

const TWITCH_SECRET = Buffer.from(process.env.TWITCH_SECRET, 'base64')
const SECRET = Buffer.from(process.env.SECRET, 'base64')

export default function (server) {
    var io = IO(server)
    io.adapter(redisAdapter({ host: process.env.REDIS, port: process.env.REDIS_PORT }))

    io.use((socket, next) => {
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
    });

    io.on('connection', (socket) => {
        const data = socket.jwt
        User.updateOne({channel_id: data.channel_id, token: data.token }, { socket_id: socket.id }, { upsert: true }).then((res, err) => {
            if (err === undefined) {
                sendPubSub(data.channel_id, {
                    mod_active: true
                })
                sendConfig(data.channel_id, { mod_active: true }, 'developer')
            }
        })
        
        socket.on('disconnect', () => {
            User.updateOne({channel_id: data.channel_id, token: data.token }, { socket_id: null }).then((res, err) => {
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

    function isInConfigCooldown(id) {
        if (inCooldown[id] != undefined && inCooldown[id].isAfter()) {
            return true;
        }

        inCooldown[id] = moment().add(3, 's')
        return false;
    }
    
}