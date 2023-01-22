import User from './models/user.model';
import {Client} from 'tmi.js';

import events from './events';

export default async () => {
    console.log('[Chat] Starting chatbot')
    const users = await User.find({})
    const channels = new Map<string, string>();
    const channel_names: string[] = [];

    users.forEach(user => {
        if ('channel_name' in user && 'connect_bot' in user && user.connect_bot === true) {
            channels.set(user.channel_name, user.channel_id)
            channel_names.push(user.channel_name)
        }
    });
    connectToChannels(channels, channel_names)

    function connectToChannels(channels: Map<string, string>, channel_names: string[]) {
        console.log(`[Chat] Connecting to '${channel_names.toString()}'`)
        const client = new Client({
            connection: {
                secure: true,
                reconnect: true
            },
            channels: channel_names,
        })

        client.connect()

        const chatStatusListener = async (channel_id: string, channel: string, status: boolean) => {
            try {
                const result = await User.updateOne({channel_id: channel_id}, {
                    channel_name: channel,
                    connect_bot: status
                })

                if (result !== undefined) {
                    if (status) {
                        client.join(channel).then((data) => {
                            channels.set(channel, channel_id)
                            console.log("joined channel: " + data)
                        })
                    } else {
                        client.part(channel).then((data) => {
                            channels.delete(channel)
                            console.log("left channel: " + data)
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

        client.on('message', (channel, tags, message, _) => {
            if ('custom-reward-id' in tags) {
                console.log(`Checking if id is in list: ${channel}`)
                let id = channels.get(channel.substring(1))
                if (id !== undefined) {
                    console.log(`Emitting channel point reward for channel: ${channel}`)
                    events.emit(['cp', id], {
                        user: tags['display-name'],
                        message: message,
                        id: tags['custom-reward-id']
                    })
                }
            }
        })
    }
}