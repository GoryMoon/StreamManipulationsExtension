import User from './models/user.model'
import { Client } from 'tmi.js'

import events from './events'
import logger from './logger'
import _isNil from 'lodash/isNil'

export default async () => {
    logger.info('[Chat] Starting chatbot')
    const users = await User.find({})
    const channels = new Map<string, string>()
    const channel_names: string[] = []

    users.forEach(user => {
        if ('channel_name' in user && 'connect_bot' in user && user.connect_bot === true) {
            channels.set(user.channel_name, user.channel_id)
            channel_names.push(user.channel_name)
        }
    })
    await connectToChannels(channels, channel_names)

    async function connectToChannels(channels: Map<string, string>, channel_names: string[]) {
        logger.info(`[Chat] Connecting to '${channel_names.toString()}'`)
        const client = new Client({
            connection: {
                secure: true,
                reconnect: true,
            },
            channels: channel_names,
        })

        await client.connect()

        const chatStatusListener = async (channel_id: string, channel: string, status: boolean) => {
            try {
                const result = await User.updateOne(
                    { channel_id: { $eq: channel_id } },
                    {
                        $set: {
                            channel_name: channel,
                            connect_bot: status,
                        },
                    },
                )

                if (!_isNil(result)) {
                    if (status) {
                        await client.join(channel).then(data => {
                            channels.set(channel, channel_id)
                            logger.info(`joined channel: ${data[0]}`)
                        })
                    } else {
                        await client.part(channel).then(data => {
                            channels.delete(channel)
                            logger.info(`left channel: ${data[0]}`)
                        })
                    }
                    events.emit(`channel_status.${channel_id}`, status)
                } else {
                    logger.error(result)
                }
            } catch (err) {
                logger.error(err)
            }
        }
        events.on('channel_status', chatStatusListener)

        client.on('message', (channel, tags, message) => {
            if ('custom-reward-id' in tags) {
                logger.info(`Checking if id is in list: ${channel}`)
                const id = channels.get(channel.substring(1))
                if (!_isNil(id)) {
                    logger.info(`Emitting channel point reward for channel: ${channel}`)
                    events.emit(`cp.${id}`, {
                        user: tags['display-name'],
                        message: message,
                        id: tags['custom-reward-id'] as string,
                    })
                }
            }
        })
    }
}
