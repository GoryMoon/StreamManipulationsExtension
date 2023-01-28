import User from './models/user.model'
import { Client } from 'tmi.js'

import events from './events'
import _isNil from 'lodash/isNil'

export default async () => {
    console.log('[Chat] Starting chatbot')
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
        console.log(`[Chat] Connecting to '${channel_names.toString()}'`)
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
                    }
                )

                if (!_isNil(result)) {
                    if (status) {
                        await client.join(channel).then(data => {
                            channels.set(channel, channel_id)
                            console.log(`joined channel: ${data[0]}`)
                        })
                    } else {
                        await client.part(channel).then(data => {
                            channels.delete(channel)
                            console.log(`left channel: ${data[0]}`)
                        })
                    }
                    events.emit(['channel_status', channel_id], status)
                } else {
                    console.error(result)
                }
            } catch (err) {
                console.error(err)
            }
        }
        events.on('channel_status', chatStatusListener)

        client.on('message', (channel, tags, message) => {
            if ('custom-reward-id' in tags) {
                console.log(`Checking if id is in list: ${channel}`)
                const id = channels.get(channel.substring(1))
                if (!_isNil(id)) {
                    console.log(`Emitting channel point reward for channel: ${channel}`)
                    events.emit(['cp', id], {
                        user: tags['display-name'],
                        message: message,
                        id: tags['custom-reward-id'] as string,
                    })
                }
            }
        })
    }
}
