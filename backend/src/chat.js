
import User from './models/user.model';
import { Client } from 'tmi.js';
import events from './events';


User.find({}).then((result) => {
    var channels = new Map()
    var channel_names = []

    result.forEach(user => {
        if ('channel_name' in user && 'connect_bot' in user && user.connect_bot === true) {
            channels.set(user.channel_name, user.channel_id)
            channel_names.push(user.channel_name)
        }
    });
    connectToChannels(channels, channel_names)
})

function connectToChannels(channels, channel_names) {
    const client = new Client({
        connection: {
            secure: true,
            reconnect: true
        },
        channels: channel_names
    })
    
    client.connect()

    const chatStatusListener = (channel_id, channel, status) => {
        User.updateOne({channel_id: channel_id}, {channel_name: channel, connect_bot: status}).then((result) => {
            if (result != undefined) {
                if (status) {
                    client.join(channel).then((data) => {
                        console.log("joined channel: " + data)
                    })
                } else {
                    client.part(channel).then((data) => {
                        console.log("left channel: " + data)
                    })
                }
                events.emit('channel_status-' + channel_id, status)
            }
        }).catch((err) => {
            console.error(err)
        })
    }
    events.on('channel_status', chatStatusListener)
    
    client.on('message', (channel, userstate, message, self) => {
        if ('custom-reward-id' in userstate) {
            let id = channels.get(channel.substring(1))
            if (id !== undefined) {
                events.emit('cp-' + id, {
                    user: userstate['display-name'],
                    message: message,
                    id: userstate['custom-reward-id']
                })
            }
        }
    })
}