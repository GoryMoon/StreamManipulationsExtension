import { defineStore } from 'pinia'
import { socket } from '@/socket'
import { remove } from 'lodash'
import { useUserStore } from './user'
import type { IChannelPointAction } from '@/types'

interface State {
    chatMessages: IChannelPointAction[]
    chatStatus: boolean
}

export const useChannelPointStore = defineStore('cp', {
    state: (): State => {
        return {
            chatMessages: [],
            chatStatus: false,
        }
    },

    actions: {
        bindEvents() {
            socket.on('chat_msg', msg => {
                if (this.chatMessages.some(m => m.id === msg.id)) {
                    remove(this.chatMessages, m => m.id === msg.id)
                }
                this.chatMessages.unshift(msg)
            })

            socket.on('update_chat_status', status => {
                this.chatStatus = status
            })
        },

        toggleChatStatus() {
            const userStore = useUserStore()
            socket.emit('set_channel_status', userStore.user!.username, !this.chatStatus)
        },
    },
})
