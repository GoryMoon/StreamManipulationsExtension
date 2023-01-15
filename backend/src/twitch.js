import axios from 'axios'
import {sign, Secret} from 'jsonwebtoken'
import Queue from 'smart-request-balancer'

export default class Twitch {

    _twitchSecret
    _queue

    constructor() {
        this._twitchSecret = Buffer.from(process.env.TWITCH_SECRET, 'base64')
        this._queue = new Queue({
            rules: {
                pubsub: {
                    rate: 100,
                    limit: 60,
                    priority: 1
                },
                config_set: {
                    rate: 20,
                    limit: 60,
                    priority: 1
                },
                config_get: {
                    rate: 20,
                    limit: 60,
                    priority: 1
                }
            },
            ignoreOverallOverheat: true
        })
    }

    sendPubSub(channel_id, message) {
        const token = sign({
            user_id: "25148021",
            role: 'external',
            channel_id: channel_id,
            pubsub_perms: {
                "send": [
                    "broadcast"
                ]
            }
        }, this._twitchSecret, {
            expiresIn: '3m'
        })

        this._queue.request((retry) => axios
            .post(`https://api.twitch.tv/helix/extensions/pubsub`,
                {
                    content_type: 'application/json',
                    message: JSON.stringify(message),
                    broadcaster_id: channel_id,
                    targets: ["broadcast"]
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': process.env.TWITCH_CLIENT_ID
                    }
                })
            .then(response => response.data)
            .catch(error => {
                if (error.response.status === 429) {
                    return retry()
                }
                throw error
            }), channel_id, 'pubsub')
            .catch(error => console.error(error))
    }

    sendConfig(channel_id, content, segment, version) {
        const token = sign({
            user_id: "25148021",
            role: 'external',
        }, this._twitchSecret, {
            expiresIn: '3m'
        })

        const body = {
            extension_id: process.env.TWITCH_CLIENT_ID,
            segment: segment,
            version: version,
            content: JSON.stringify(content),
        }

        if (segment !== 'global') {
            body['broadcaster_id'] = channel_id
        }

        this._queue.request((retry) => axios
            .put(`https://api.twitch.tv/helix/extensions/configurations`,
                body,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': process.env.TWITCH_CLIENT_ID
                    }
                }
            )
            .then(response => response.data)
            .catch(error => {
                if (error.response.status === 429 || (error.response.status === 409 && error.response.data.message === 'Concurrency failure: please retry')) {
                    return retry()
                }
                throw error
            }), channel_id !== null ? `${channel_id}-${segment}` : segment, 'config_set')
            .catch((error) => console.error(error))
    }

    getConfig(channel_id, segment) {
        const token = sign({
            user_id: "25148021",
            role: 'external',
        }, this._twitchSecret, {
            expiresIn: '3m'
        })

        const params = {
            segment: segment,
            extension_id: process.env.TWITCH_CLIENT_ID
        }
        if (segment !== 'global')
            params['broadcaster_id'] = channel_id;

        return this._queue.request((retry) => axios
            .get(`https://api.twitch.tv/helix/extensions/configurations`,
                {
                    params,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': process.env.TWITCH_CLIENT_ID
                    }
                }
            )
            .then(response => response.data)
            .catch(error => {
                if (error.response.status === 429) {
                    return retry()
                }
                throw error
            }), channel_id !== null ? `${channel_id}-${segment}` : segment, 'config_get')
    }
}