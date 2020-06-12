import axios from 'axios';
import jwt from 'jsonwebtoken';
import Queue from 'smart-request-balancer';

const TWITCH_SECRET = Buffer.from(process.env.TWITCH_SECRET, 'base64')
const queue = new Queue({
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

function sendPubSub(channel_id, message) {
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

    queue.request((retry) => axios
        .post(`https://api.twitch.tv/extensions/message/${channel_id}`,
        {
            content_type: 'application/json',
            message: JSON.stringify(message),
            targets: ["broadcast"]
        },{
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

function sendConfig(channel_id, content, segment, version) {
    const token = jwt.sign({
        user_id: "25148021",
        role: 'external',
    }, TWITCH_SECRET, {
        expiresIn: '3m'
    })

    const body = {
        version: version,
        segment: segment,
        content: JSON.stringify(content),
    }

    if (segment !== 'global') {
        body['channel_id'] = channel_id;
    }

    queue.request((retry) => axios
        .put(`https://api.twitch.tv/extensions/${process.env.TWITCH_CLIENT_ID}/configurations`,
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
            if (error.response.status === 429) {
                return retry()
            }
            throw error
        }), channel_id !== null ? `${channel_id}-${segment}`: segment, 'config_set')
        .catch((error) => console.error(error))
}

function getConfig(channel_id, segment) {
    const token = jwt.sign({
        user_id: "25148021",
        role: 'external',
    }, TWITCH_SECRET, {
        expiresIn: '3m'
    })

    const params = segment === 'global' ? {}: { channel_id }

    return queue.request((retry) => axios
        .get(`https://api.twitch.tv/extensions/${process.env.TWITCH_CLIENT_ID}/configurations/segments/${segment}`,
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
        }), channel_id !== null ? `${channel_id}-${segment}`: segment, 'config_get')
}

export { sendPubSub, sendConfig, getConfig }
