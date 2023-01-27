import axios from 'axios'
import { sign } from 'jsonwebtoken'
import Queue from 'smart-request-balancer'

export default class Twitch {
    _twitchSecret
    _queue

    constructor() {
        this._twitchSecret = Buffer.from(process.env.TWITCH_SECRET as string, 'base64')
        this._queue = new Queue({
            rules: {
                pubsub: {
                    rate: 100,
                    limit: 60,
                    priority: 1,
                },
                config_set: {
                    rate: 20,
                    limit: 60,
                    priority: 1,
                },
                config_get: {
                    rate: 20,
                    limit: 60,
                    priority: 1,
                },
            },
            ignoreOverallOverheat: true,
        })
    }

    async sendPubSub(channel_id: string, message: object) {
        const token = sign(
            {
                user_id: '25148021',
                role: 'external',
                channel_id: channel_id,
                pubsub_perms: {
                    send: ['broadcast'],
                },
            },
            this._twitchSecret,
            {
                expiresIn: '3m',
            }
        )

        try {
            await this._queue.request(
                async retry => {
                    try {
                        await axios.post(
                            `https://api.twitch.tv/helix/extensions/pubsub`,
                            {
                                content_type: 'application/json',
                                message: JSON.stringify(message),
                                broadcaster_id: channel_id,
                                targets: ['broadcast'],
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Client-Id': process.env.TWITCH_CLIENT_ID,
                                },
                            }
                        )
                    } catch (error) {
                        if (axios.isAxiosError(error) && error.response?.status === 429) {
                            return retry()
                        }
                        throw error
                    }
                },
                channel_id,
                'pubsub'
            )
        } catch (e) {
            console.log(e)
        }
    }

    async sendConfig(channel_id: string, content: object, segment: string, version: string) {
        const token = sign(
            {
                user_id: '25148021',
                role: 'external',
            },
            this._twitchSecret,
            {
                expiresIn: '3m',
            }
        )

        const body = new Map([
            ['extension_id', process.env.TWITCH_CLIENT_ID],
            ['segment', segment],
            ['version', version],
            ['content', JSON.stringify(content)],
        ])

        if (segment !== 'global') {
            body.set('broadcaster_id', channel_id)
        }

        try {
            await this._queue.request(
                async retry => {
                    try {
                        await axios.put(`https://api.twitch.tv/helix/extensions/configurations`, body, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Client-Id': process.env.TWITCH_CLIENT_ID,
                            },
                        })
                    } catch (error) {
                        if (
                            axios.isAxiosError(error) &&
                            error.response &&
                            (error.response.status === 429 || error.response.status === 409)
                        ) {
                            return retry()
                        }
                        throw error
                    }
                },
                channel_id !== null ? `${channel_id}-${segment}` : segment,
                'config_set'
            )
        } catch (e) {
            console.log(e)
        }
    }

    async getConfig(channel_id: string, segment: string) {
        const token = sign(
            {
                user_id: '25148021',
                role: 'external',
            },
            this._twitchSecret,
            {
                expiresIn: '3m',
            }
        )

        const params = new Map([
            ['segment', segment],
            ['extension_id', process.env.TWITCH_CLIENT_ID],
            ['broadcaster_id', undefined],
        ])
        if (segment !== 'global') params.set('broadcaster_id', channel_id)

        try {
            await this._queue.request(
                async retry => {
                    try {
                        await axios.get(`https://api.twitch.tv/helix/extensions/configurations`, {
                            params,
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Client-Id': process.env.TWITCH_CLIENT_ID,
                            },
                        })
                    } catch (error) {
                        if (axios.isAxiosError(error) && error.response?.status === 429) {
                            return retry()
                        }
                        throw error
                    }
                },
                channel_id !== null ? `${channel_id}-${segment}` : segment,
                'config_get'
            )
        } catch (e) {
            console.log(e)
        }
    }
}
