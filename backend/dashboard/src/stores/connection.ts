import { defineStore } from 'pinia'
import { socket } from '@/socket'
import type { IDashGame } from '@/types'

interface State {
    connected: boolean
    connectedGame: IDashGame | null
}

export const useConnectionStore = defineStore('connection', {
    state: (): State => {
        return {
            connected: false,
            connectedGame: null,
        }
    },

    getters: {
        isGameConnected(): boolean {
            return this.connectedGame !== null
        },
    },

    actions: {
        bindEvents() {
            socket.on('connect', () => {
                this.connected = true
            })

            socket.on('disconnect', () => {
                this.connected = false
            })

            socket.on('update_game_connection', connectedGame => {
                this.connectedGame = connectedGame
            })
        },

        connect(token: string) {
            socket.auth = {
                token: token
            }
            socket.connect()
        },
    },
})
